/* eslint-disable @typescript-eslint/require-await */
// src/modules/office-integration/adapters/word.adapter.ts
import { Injectable } from '@nestjs/common';
import { Citation } from "generated/prisma";
import { Position } from "src/modules/collaboration/interfaces/document-operation.interface";
import { OfficePlatform } from '../enums/platform.enum';
import { BasePlatformAdapter } from './base-platform-adapter';
import { EntryPointConfig, ManifestConfig } from '../interfaces/office-adapter.interface';

@Injectable()
export class WordAdapter extends BasePlatformAdapter {
  platform = OfficePlatform.WORD;

  generateManifest(config: ManifestConfig): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1" 
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
           xsi:type="TaskPaneApp">
  <Id>${config.appId}</Id>
  <Version>${config.version}</Version>
  <ProviderName>Reference Collector</ProviderName>
  <DefaultLocale>en-US</DefaultLocale>
  <DisplayName DefaultValue="${config.displayName}" />
  <Description DefaultValue="${config.description}" />
  <IconUrl DefaultValue="${config.baseUrl}/assets/icon-32.png" />
  <HighResolutionIconUrl DefaultValue="${config.baseUrl}/assets/icon-64.png" />
  <SupportUrl DefaultValue="${config.baseUrl}/support" />
  
  <!-- Word'de çalışacağını belirtir -->
  <Hosts>
    <Host Name="Document" />
  </Hosts>
  
  <!-- Add-in açıldığında hangi URL'i yükleyeceği -->
  <DefaultSettings>
    <SourceLocation DefaultValue="${config.baseUrl}/office/word/entry" />
  </DefaultSettings>
  
  <!-- Dokümana okuma/yazma izni -->
  <Permissions>${config.permissions.join(',')}</Permissions>
  
  <!-- Word ribbon'ına buton ekler -->
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
      <Host xsi:type="Document">
        <DesktopFormFactor>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="CommandsGroup">
                <Label resid="CommandsGroup.Label" />
                <Control xsi:type="Button" id="TaskpaneButton">
                  <Label resid="TaskpaneButton.Label" />
                  <Supertip>
                    <Title resid="TaskpaneButton.Label" />
                    <Description resid="TaskpaneButton.Tooltip" />
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="Icon.16x16" />
                    <bt:Image size="32" resid="Icon.32x32" />
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>ButtonId1</TaskpaneId>
                    <SourceLocation resid="Taskpane.Url" />
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="Icon.16x16" DefaultValue="${config.baseUrl}/assets/icon-16.png" />
        <bt:Image id="Icon.32x32" DefaultValue="${config.baseUrl}/assets/icon-32.png" />
      </bt:Images>
      <bt:Urls>
        <bt:Url id="Taskpane.Url" DefaultValue="${config.baseUrl}/office/word/entry" />
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="CommandsGroup.Label" DefaultValue="Reference Collector" />
        <bt:String id="TaskpaneButton.Label" DefaultValue="Show Taskpane" />
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="TaskpaneButton.Tooltip" DefaultValue="Open Reference Collector" />
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>`;
  }

  generateEntryPoint(config: EntryPointConfig): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=Edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Reference Collector</title>
    
    <!-- Microsoft Office.js API -->
    <script src="https://appsforoffice.microsoft.com/lib/1/hosted/office.js"></script>
    
    <!-- App stilleri - Frontend team tarafından oluşturulacak -->
    <link rel="stylesheet" href="${config.baseUrl}/office/word/styles.css">
    <link rel="stylesheet" href="${config.baseUrl}/office/themes/${config.theme}.css">
</head>
<body class="ms-welcome">
    <!-- Frontend app'i buraya mount edilecek -->
    <div id="root">
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading Reference Collector...</p>
        </div>
    </div>
    
    <!-- Konfigürasyon - Frontend'in kullanacağı -->
    <script>
        window.OFFICE_CONFIG = {
            platform: 'word',
            apiUrl: '${process.env.API_URL || config.baseUrl + '/api/v1'}',
            locale: '${config.locale}',
            theme: '${config.theme}'
        };
    </script>
    
    <!-- Frontend app bundle - Frontend team tarafından oluşturulacak -->
    <script src="${config.baseUrl}/office/word/app.js"></script>
</body>
</html>`;
  }

  async insertCitation(citation: Citation, position: Position): Promise<void> {
    // Word'e citation ekleme logic'i
    // Frontend'den gelecek Office.js API calls'ları burada handle edilecek
  }

  async updateCitation(citationId: string, citation: Citation): Promise<void> {
    // Word'de citation güncelleme logic'i
  }

  async syncDocument(): Promise<any> {
    // Word dokümantını sync etme logic'i
    return { success: true };
  }

  async getCitations(): Promise<Citation[]> {
    // Word'den citation'ları alma logic'i
    return [];
  }

  async validateDocument(documentId: string): Promise<boolean> {
    // Word dokümantının geçerli olup olmadığını kontrol et
    return true;
  }
}