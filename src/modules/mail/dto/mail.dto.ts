
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum CustomerType {
    INDIVIDUAL = 'individual',
    CORPORATE = 'corporate'
}

export enum ContactSubject {
    GENERAL = 'general',
    SUPPORT = 'support',
    SALES = 'sales',
    CORPORATE = 'corporate',
    PARTNERSHIP = 'partnership',
    OTHER = 'other'
}

export class SendContactEmailDto {
    @ApiProperty({
        example: 'Ahmet',
        description: 'Kullanıcının adı'
    })
    @IsNotEmpty({ message: 'Ad alanı zorunludur' })
    @IsString({ message: 'Ad string olmalıdır' })
    firstName: string;

    @ApiProperty({
        example: 'Yılmaz',
        description: 'Kullanıcının soyadı'
    })
    @IsNotEmpty({ message: 'Soyad alanı zorunludur' })
    @IsString({ message: 'Soyad string olmalıdır' })
    lastName: string;

    @ApiProperty({
        example: 'ahmet@example.com',
        description: 'Kullanıcının e-posta adresi'
    })
    @IsNotEmpty({ message: 'E-posta alanı zorunludur' })
    @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
    email: string;

    @ApiProperty({
        example: '+90 555 123 45 67',
        description: 'Kullanıcının telefon numarası (opsiyonel)',
        required: false
    })
    @IsOptional()
    @IsString({ message: 'Telefon string olmalıdır' })
    phone?: string;

    @ApiProperty({
        example: 'Acme Corp.',
        description: 'Şirket adı (kurumsal müşteriler için zorunlu)',
        required: false
    })
    @IsOptional()
    @IsString({ message: 'Şirket adı string olmalıdır' })
    @ValidateIf((obj) => obj.customerType === CustomerType.CORPORATE)
    @IsNotEmpty({ message: 'Kurumsal müşteriler için şirket adı zorunludur' })
    company?: string;

    @ApiProperty({
        enum: CustomerType,
        example: CustomerType.INDIVIDUAL,
        description: 'Müşteri tipi'
    })
    @IsNotEmpty({ message: 'Müşteri tipi zorunludur' })
    @IsEnum(CustomerType, { message: 'Geçerli bir müşteri tipi seçiniz' })
    customerType: CustomerType;

    @ApiProperty({
        enum: ContactSubject,
        example: ContactSubject.GENERAL,
        description: 'İletişim konusu'
    })
    @IsNotEmpty({ message: 'Konu alanı zorunludur' })
    @IsEnum(ContactSubject, { message: 'Geçerli bir konu seçiniz' })
    subject: ContactSubject;

    @ApiProperty({
        example: 'Merhaba, ürününüz hakkında daha fazla bilgi almak istiyorum...',
        description: 'İletişim mesajı'
    })
    @IsNotEmpty({ message: 'Mesaj alanı zorunludur' })
    @IsString({ message: 'Mesaj string olmalıdır' })
    message: string;
}