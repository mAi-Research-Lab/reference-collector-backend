import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class UpdateCitationStyleDto {
    @ApiProperty({ example: 'IEEE' })
    @IsString()
    @IsOptional()
    name: string

    @ApiProperty({ example: 'IEEE' })
    @IsString()
    @IsOptional()
    shortName: string

    @ApiPropertyOptional({ example: 'Style description' })
    @IsString()
    @IsOptional()
    description?: string | null

    @ApiProperty({
        example: `<?xml version="1.0" encoding="utf-8"?>
<style xmlns="http://purl.org/net/xbiblio/csl" 
       class="in-text" 
       version="1.0">
  <info>
    <title>My University Style</title>
    <title-short>MU</title-short>
    <id>http://myapp.com/styles/my-university</id>
    <updated>2025-07-21T00:00:00+00:00</updated>
  </info>
  
  <macro name="author">
    <names variable="author">
      <name name-as-sort-order="all" 
            and="&amp;" 
            delimiter=", "/>
    </names>
  </macro>
  
  <citation>
    <layout prefix="[" suffix="]" delimiter="; ">
      <text macro="author"/>
      <text variable="issued" prefix=", " date-parts="year"/>
    </layout>
  </citation>
  
  <bibliography>
    <layout>
      <text macro="author" suffix=". "/>
      <text variable="issued" prefix="(" suffix="). "/>
      <text variable="title" font-style="italic" suffix=". "/>
      <text variable="container-title"/>
    </layout>
  </bibliography>
</style>` })
    @IsString()
    @IsOptional()
    cslContent: string

    @ApiProperty({ example: 'apa' })
    @IsString()
    @IsOptional()
    category: string

    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    isDefault: boolean

    @ApiProperty({ example: true })
    @IsBoolean()
    @IsOptional()
    isCustom: boolean

    @ApiProperty({ example: 0 })
    @IsOptional()
    downloadCount: number
}