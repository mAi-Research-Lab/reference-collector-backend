import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CitationStyleResponse {
  @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
  id:string

  @ApiProperty({ example: 'IEEE' })
  name: string

  @ApiProperty({ example: 'IEEE' })
  shortName: string

  @ApiPropertyOptional({ example: 'Style description' })
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
  cslContent: string

  @ApiProperty({ example: 'apa' })
  category: string

  @ApiProperty({ example: true })
  isDefault: boolean

  @ApiProperty({ example: true })
  isCustom: boolean

  @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
  createdBy: string | null

  @ApiProperty({ example: 0 })
  downloadCount: number

  @ApiProperty({ example: '2022-01-01T00:00:00.000Z' })
  createdAt: Date

  @ApiProperty({ example: '2022-01-01T00:00:00.000Z' })
  updatedAt: Date
}