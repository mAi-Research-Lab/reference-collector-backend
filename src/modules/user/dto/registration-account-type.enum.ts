/**
 * Kayıt / create-user DTO’da kullanılan hesap türü (API).
 * Veritabanındaki {@link UserType} enum’u değişmez; servis katmanında eşlenir:
 * - individual → individual
 * - corporate  → institutional (kurumsal)
 */
export enum RegistrationAccountType {
    individual = 'individual',
    corporate = 'corporate',
}
