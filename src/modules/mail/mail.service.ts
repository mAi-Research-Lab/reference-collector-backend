import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';
import { MailMessages } from 'src/common/constants/common.messages';
import { CustomerType, SendContactEmailDto } from './dto/mail.dto';
import { UserResponse } from '../user/dto/user.response';

@Injectable()
export class MailService {
    private transporter;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get('EMAIL_APP_MAIL'),
                pass: this.configService.get('EMAIL_APP_PASSWORD'),
            },
        });
    }

    async loadTemplate(templateName: string): Promise<string> {
        try {
            const templatePath = path.join(process.cwd(), 'src', 'resources', 'email-templates', `${templateName}.html`);
            return fs.promises.readFile(templatePath, 'utf8');
        } catch {
            throw new BadRequestException(MailMessages.TEMPLATE_NOT_FOUND);
        }
    }

    replaceTemplateVariables(template: string, variables: Record<string, string>): string {
        try {
            return Object.entries(variables).reduce((result, [key, value]) => {
                return result.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }, template);
        } catch {
            throw new BadRequestException(MailMessages.TEMPLATE_RENDERING_ERROR);
        }
    }

    private encodeMessage(message: { to: string; subject: string; html: string }): string {
        if (!message.to || !message.subject || !message.html) {
            throw new BadRequestException(MailMessages.INVALID_TEMPLATE_DATA);
        }

        // Subject'i base64 ile encode et
        const encodedSubject = Buffer.from(message.subject).toString('base64');

        const str = [
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `To: ${message.to}`,
            `Subject: =?UTF-8?B?${encodedSubject}?=`,
            'Content-Transfer-Encoding: base64',
            '',
            Buffer.from(message.html).toString('base64')
        ].join('\n');

        return Buffer.from(str).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    async sendMail(to: string, subject: string, html: string): Promise<{ message: string }> {
        if (!to || !this.isValidEmail(to)) {
            throw new BadRequestException(MailMessages.INVALID_EMAIL_ADDRESS);
        }

        const message = {
            to,
            subject,
            html,
        };

        try {
            await this.transporter.sendMail({
                from: this.configService.get('EMAIL_APP_MAIL') || 'noreply@airisto.com',
                to: message.to,
                subject: message.subject,
                html: message.html
            })

            return { message: MailMessages.EMAIL_SENT_SUCCESS };
        } catch (error) {
            console.error('Error sending email:', error);
            throw new InternalServerErrorException(MailMessages.EMAIL_SEND_FAILED);
        }
    }

    async sendVerificationEmail(user: UserResponse, token: string): Promise<{ message: string }> {
        const verificationUrl = `${this.configService.get('EMAIL_VERIFICATION_URL')}?token=${token}`;

        const template = await this.loadTemplate('verification');
        const html = this.replaceTemplateVariables(template, {
            name: user.fullName,
            verificationUrl,
        });

        return this.sendMail(
            user.email,
            'E-posta Adresinizi Doğrulayın - Citext',
            html,
        );
    }

    private isValidEmail(email: string): boolean {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async sendPasswordResetEmail(email: string, name: string, token: string) {
        const template = await this.loadTemplate('password-reset');
        const html = this.replaceTemplateVariables(template, {
            name,
            token,
        });

        return this.sendMail(
            email,
            'Şifre Sıfırlama - Citext',
            html,
        );
    }

    private getSubjectDisplay(subject: string): string {
        const subjectMap = {
            'general': 'Genel Bilgi',
            'support': 'Teknik Destek',
            'sales': 'Satış ve Fiyatlandırma',
            'corporate': 'Kurumsal Çözümler',
            'partnership': 'İş Ortaklığı',
            'other': 'Diğer'
        };
        return subjectMap[subject] || subject;
    }

    private getCustomerTypeDisplay(customerType: string): string {
        return customerType === 'corporate' ? 'Kurumsal Müşteri' : 'Bireysel Kullanıcı';
    }

    private getResponseTime(customerType: string): string {
        return customerType === 'corporate' ? '4 saat' : '24 saat';
    }

    private getPriorityInfo(customerType: string, subject: string) {
        if (customerType === 'corporate') {
            if (subject === 'corporate' || subject === 'partnership') {
                return {
                    icon: '🔥',
                    text: 'Yüksek Öncelik - Kurumsal müşteri talebi',
                    bg: '#2d1b2d',
                    color: '#e74c3c'
                };
            }
            return {
                icon: '⚡',
                text: 'Orta Öncelik - Kurumsal müşteri',
                bg: '#2d2d1b',
                color: '#f39c12'
            };
        }
        return {
            icon: '📌',
            text: 'Normal Öncelik - Bireysel müşteri',
            bg: '#1b2d2d',
            color: '#3498db'
        };
    }

    private formatDate(): string {
        return new Intl.DateTimeFormat('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Istanbul'
        }).format(new Date());
    }

    async sendContactConfirmationEmail(contactData: SendContactEmailDto): Promise<{ message: string }> {
        try {
            const template = await this.loadTemplate('contact-confirmation');

            const customerTypeDisplay = this.getCustomerTypeDisplay(contactData.customerType);
            const responseTime = this.getResponseTime(contactData.customerType);
            const subjectDisplay = this.getSubjectDisplay(contactData.subject);

            const companySection = contactData.company
                ? `<strong style="color:#a0a0a0;">Şirket:</strong> ${contactData.company}<br>`
                : '';

            const html = this.replaceTemplateVariables(template, {
                firstName: contactData.firstName,
                responseTime,
                subject: subjectDisplay,
                customerTypeDisplay,
                companySection,
                date: this.formatDate()
            });

            return this.sendMail(
                contactData.email,
                'Mesajınız Alındı - Citext',
                html
            );
        } catch (error) {
            console.error('Error sending contact confirmation email:', error);
            throw new InternalServerErrorException('Onay e-postası gönderilemedi');
        }
    }

    async sendContactNotificationEmail(contactData: SendContactEmailDto): Promise<{ message: string }> {
        try {
            const template = await this.loadTemplate('contact-notification');

            const customerTypeDisplay = this.getCustomerTypeDisplay(contactData.customerType);
            const responseTime = this.getResponseTime(contactData.customerType);
            const subjectDisplay = this.getSubjectDisplay(contactData.subject);
            const priorityInfo = this.getPriorityInfo(contactData.customerType, contactData.subject);

            const phoneSection = contactData.phone
                ? `<strong style="color:#a0a0a0;">Telefon:</strong> <a href="tel:${contactData.phone}" style="color:#667eea;text-decoration:none;">${contactData.phone}</a><br>`
                : '';

            const companySection = contactData.company
                ? `<strong style="color:#a0a0a0;">Şirket:</strong> ${contactData.company}<br>`
                : '';

            const customerTypeStyle = contactData.customerType === CustomerType.CORPORATE
                ? 'color:#f39c12;font-weight:600;'
                : 'color:#3498db;';

            const html = this.replaceTemplateVariables(template, {
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                email: contactData.email,
                phone: contactData.phone || '',
                phoneSection,
                customerTypeDisplay,
                customerTypeStyle,
                companySection,
                subject: subjectDisplay,
                message: contactData.message,
                date: this.formatDate(),
                responseTime,
                priorityIcon: priorityInfo.icon,
                priorityText: priorityInfo.text,
                priorityBg: priorityInfo.bg,
                priorityColor: priorityInfo.color
            });

            const adminEmail = this.configService.get('ADMIN_EMAIL') || 'yesaribaris23@gmail.com';

            return this.sendMail(
                adminEmail,
                `[${customerTypeDisplay}] ${contactData.firstName} ${contactData.lastName} - ${subjectDisplay}`,
                html
            );
        } catch (error) {
            console.error('Error sending contact notification email:', error);
            throw new InternalServerErrorException('Admin bildirim e-postası gönderilemedi');
        }
    }

    async sendContactEmails(contactData: SendContactEmailDto): Promise<{ message: string }> {
        try {
            if (!contactData.firstName || !contactData.lastName || !contactData.email || !contactData.subject || !contactData.message) {
                throw new BadRequestException('Zorunlu alanlar eksik');
            }

            if (!this.isValidEmail(contactData.email)) {
                throw new BadRequestException('Geçersiz e-posta adresi');
            }

            if (contactData.customerType === CustomerType.CORPORATE && !contactData.company) {
                throw new BadRequestException('Kurumsal müşteriler için şirket adı zorunludur');
            }

            await Promise.all([
                this.sendContactConfirmationEmail(contactData),
                this.sendContactNotificationEmail(contactData)
            ]);

            return {
                message: contactData.customerType === CustomerType.CORPORATE
                    ? 'Mesajınız başarıyla gönderildi. Kurumsal müşteri desteğimiz 24 saat içinde size geri dönüş yapacaktır.'
                    : 'Mesajınız başarıyla gönderildi. 24 saat içinde size geri dönüş yapacağız.'
            };
        } catch (error) {
            console.error('Error sending contact emails:', error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('İletişim e-postaları gönderilemedi');
        }
    }

    async sendCollaborationInvitationEmail(
        recipientEmail: string,
        recipientName: string,
        inviterName: string,
        documentTitle: string,
        documentId: string
    ): Promise<{ message: string }> {
        try {
            const template = await this.loadTemplate('collaboration-invitation');
            const documentUrl = `${this.configService.get('FRONTEND_URL')}/documents/${documentId}`;

            const html = this.replaceTemplateVariables(template, {
                recipientName,
                inviterName,
                documentTitle,
                documentUrl,
            });

            return this.sendMail(
                recipientEmail,
                `${inviterName} sizi bir belgeye davet etti - Citext`,
                html,
            );
        } catch (error) {
            console.error('Error sending collaboration invitation email:', error);
            throw new InternalServerErrorException('Davet e-postası gönderilemedi');
        }
    }

    async sendLibraryInvitationEmail(
        recipientEmail: string,
        recipientName: string,
        inviterName: string,
        libraryName: string,
        inviteToken: string
    ): Promise<{ message: string }> {
        try {
            const template = await this.loadTemplate('library-invitation');
            const inviteUrl = `${this.configService.get('FRONTEND_URL')}/accept-invitation/${inviteToken}`;

            const html = this.replaceTemplateVariables(template, {
                recipientName: recipientName || 'Kullanıcı',
                inviterName,
                libraryName,
                inviteUrl,
            });

            return this.sendMail(
                recipientEmail,
                `${inviterName} sizi "${libraryName}" kütüphanesine davet etti - Citext`,
                html,
            );
        } catch (error) {
            console.error('Error sending library invitation email:', error);
            throw new InternalServerErrorException('Kütüphane davet e-postası gönderilemedi');
        }
    }
}
