import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

@Injectable()
export class S3StorageService implements OnModuleInit {
    private readonly logger = new Logger(S3StorageService.name);
    private s3: S3Client;
    private bucket: string;
    private isConfigured = false;

    constructor(private readonly configService: ConfigService) {}

    onModuleInit() {
        const accessKeyId = this.configService.get<string>("AWS_ACCESS_KEY_ID");
        const secretAccessKey = this.configService.get<string>("AWS_SECRET_ACCESS_KEY");
        const region = this.configService.get<string>("AWS_REGION", "eu-central-1");
        this.bucket = this.configService.get<string>("AWS_S3_BUCKET_NAME", "");

        if (!accessKeyId || !secretAccessKey || !this.bucket) {
            this.logger.warn(
                "AWS S3 credentials or bucket not configured — S3 uploads disabled",
            );
            return;
        }

        this.s3 = new S3Client({
            region,
            credentials: { accessKeyId, secretAccessKey },
        });

        this.isConfigured = true;
        this.logger.log(`S3 storage ready — bucket: ${this.bucket}, region: ${region}`);
    }

    get ready(): boolean {
        return this.isConfigured;
    }

    buildKey(userId: string, referenceId: string, filename: string): string {
        return `users/${userId}/references/${referenceId}/${filename}`;
    }

    async uploadFile(
        buffer: Buffer,
        key: string,
        mimeType: string,
    ): Promise<{ key: string; size: number }> {
        this.ensureConfigured();

        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: mimeType,
            }),
        );

        this.logger.log(`Uploaded to S3: ${key} (${buffer.length} bytes)`);
        return { key, size: buffer.length };
    }

    async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
        this.ensureConfigured();

        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        const url = await getSignedUrl(this.s3, command, {
            expiresIn: expiresInSeconds,
        });

        return url;
    }

    async deleteFile(key: string): Promise<void> {
        this.ensureConfigured();

        await this.s3.send(
            new DeleteObjectCommand({
                Bucket: this.bucket,
                Key: key,
            }),
        );

        this.logger.log(`Deleted from S3: ${key}`);
    }

    async fileExists(key: string): Promise<boolean> {
        this.ensureConfigured();

        try {
            await this.s3.send(
                new HeadObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Sum object sizes under a prefix (bytes). Uses ListObjectsV2 pagination.
     * Note: This can be expensive for many objects — callers should cache results.
     */
    async getPrefixSizeBytes(prefix: string): Promise<bigint> {
        this.ensureConfigured();

        let continuationToken: string | undefined;
        let total = BigInt(0);

        do {
            const resp = await this.s3.send(
                new ListObjectsV2Command({
                    Bucket: this.bucket,
                    Prefix: prefix,
                    ContinuationToken: continuationToken,
                }),
            );

            const contents = resp.Contents || [];
            for (const obj of contents) {
                const size = obj.Size ?? 0;
                total += BigInt(size);
            }

            continuationToken = resp.IsTruncated ? resp.NextContinuationToken : undefined;
        } while (continuationToken);

        return total;
    }

    private ensureConfigured(): void {
        if (!this.isConfigured) {
            throw new Error(
                "S3 is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_S3_BUCKET_NAME in .env",
            );
        }
    }
}
