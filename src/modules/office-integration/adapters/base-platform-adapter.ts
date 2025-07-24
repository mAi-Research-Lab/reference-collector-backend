import { Citation } from "generated/prisma";
import { Position } from "src/modules/collaboration/interfaces/document-operation.interface";
import { OfficePlatform } from "../enums/platform.enum";
import { EntryPointConfig, ManifestConfig } from "../interfaces/office-adapter.interface";

export abstract class BasePlatformAdapter {
  abstract platform: OfficePlatform;

  abstract insertCitation(citation: Citation, position: Position): Promise<void>;
  abstract updateCitation(citationId: string, citation: Citation): Promise<void>;
  abstract syncDocument(): Promise<any>;
  abstract getCitations(): Promise<Citation[]>;

  abstract generateManifest(config: ManifestConfig): string;
  abstract generateEntryPoint(config: EntryPointConfig): string;

  abstract validateDocument(documentId: string): Promise<boolean>;
}