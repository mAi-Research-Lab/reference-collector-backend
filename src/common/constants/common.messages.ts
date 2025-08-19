export const COMMON_MESSAGES = {
    USER_NOT_FOUND: 'User not found',
    EMAIL_ALREADY_EXISTS: 'Email already exists',
    INVALID_CREDENTIALS: 'Invalid credentials',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    INTERNAL_SERVER_ERROR: 'Internal server error',
}

export enum MailMessages {
    // Başarı Mesajları
    EMAIL_SENT_SUCCESS = 'E-posta başarıyla gönderildi',
    CONTACT_EMAIL_SENT_SUCCESS = 'İletişim mesajınız başarıyla gönderildi',
    CONTACT_CONFIRMATION_SENT = 'Onay e-postası başarıyla gönderildi',
    CONTACT_NOTIFICATION_SENT = 'Admin bildirim e-postası başarıyla gönderildi',
    TEMPLATE_CREATED_SUCCESS = 'E-posta şablonu başarıyla oluşturuldu',
    TEMPLATE_UPDATED_SUCCESS = 'E-posta şablonu başarıyla güncellendi',
    AUTH_URL_RETRIEVED_SUCCESS = 'Gmail API yetkilendirme URL\'i başarıyla getirildi',
    TOKENS_RETRIEVED_SUCCESS = 'Gmail API token\'ları başarıyla alındı',

    // Hata Mesajları
    EMAIL_SEND_FAILED = 'E-posta gönderimi başarısız oldu',
    CONTACT_EMAIL_SEND_FAILED = 'İletişim e-postaları gönderilemedi',
    CONTACT_CONFIRMATION_FAILED = 'Onay e-postası gönderilemedi',
    CONTACT_NOTIFICATION_FAILED = 'Admin bildirim e-postası gönderilemedi',
    INVALID_EMAIL_ADDRESS = 'Geçersiz e-posta adresi sağlandı',
    INVALID_CONTACT_DATA = 'Geçersiz iletişim formu verisi',
    MISSING_REQUIRED_FIELDS = 'Zorunlu alanlar eksik',
    COMPANY_REQUIRED_FOR_CORPORATE = 'Kurumsal müşteriler için şirket adı zorunludur',
    TEMPLATE_NOT_FOUND = 'E-posta şablonu bulunamadı',
    INVALID_TEMPLATE_DATA = 'Geçersiz şablon verisi sağlandı',
    SMTP_CONNECTION_ERROR = 'SMTP sunucusuna bağlanılamadı',
    TEMPLATE_RENDERING_ERROR = 'E-posta şablonu işleme başarısız oldu'
}