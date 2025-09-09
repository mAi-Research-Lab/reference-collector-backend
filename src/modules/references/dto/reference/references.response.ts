import { ApiProperty } from "@nestjs/swagger";
import { JsonValue } from "generated/prisma/runtime/library";

export class ReferencesResponse {
   @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
   id: string;

   @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
   libraryId: string;

   @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
   collectionId?: string | null;

   @ApiProperty({ example: 'journal' })
   type: string;

   @ApiProperty({ example: 'Machine Learning in Healthcare: A Comprehensive Review' })
   title: string;

   @ApiProperty({ 
       example: [
           { "name": "John Doe", "affiliation": "MIT" },
           { "name": "Jane Smith", "affiliation": "Harvard" }
       ]
   })
   authors: any | null;

   @ApiProperty({ 
       example: [
           { "name": "Robert Johnson", "affiliation": "Stanford" }
       ]
   })
   editors: any | null;

   @ApiProperty({ example: 'Nature Medicine' })
   publication: string | null;

   @ApiProperty({ example: 'Nature Publishing Group' })
   publisher: string | null;

   @ApiProperty({ example: 2023 })
   year: number | null;

   @ApiProperty({ example: '29' })
   volume: string | null;

   @ApiProperty({ example: '4' })
   issue: string | null;

   @ApiProperty({ example: '456-467' })
   pages: string | null;

   @ApiProperty({ example: '10.1038/s41591-023-02394-0' })
   doi: string | null;

   @ApiProperty({ example: '978-3-16-148410-0' })
   isbn: string | null;

   @ApiProperty({ example: '1078-8956' })
   issn: string | null;

   @ApiProperty({ example: 'https://www.nature.com/articles/s41591-023-02394-0' })
   url: string | null;

   @ApiProperty({ example: 'This comprehensive review examines the current state and future prospects of machine learning applications in healthcare...' })
   abstractText: string | null;

   @ApiProperty({ example: 'English' })
   language: string | null;

   @ApiProperty({ 
       example: {
           "keywords": ["machine learning", "healthcare", "AI"],
           "impact_factor": 87.241,
           "open_access": true
       }
   })
   metadata: any | null;

   @ApiProperty({ example: ['machine-learning', 'healthcare', 'artificial-intelligence'] })
   tags: JsonValue | null;

   @ApiProperty({ example: 'Important paper for research project. Follow up with author.' })
   notes: string | null;

   @ApiProperty({ example: '2023-10-15T10:30:00Z' })
   dateAdded: Date;

   @ApiProperty({ example: '2023-10-16T14:20:00Z' })
   dateModified: Date;

   @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
   addedBy: string;

   @ApiProperty({ example: '14e56bb0-ed2f-4567-bb07-a3b2649ed80d' })
   modifiedBy: string | null;

   @ApiProperty({ example: 145 })
   citationCount: number;

   @ApiProperty({ example: false })
   isDeleted: boolean;

   @ApiProperty({ example: null, description: 'PostgreSQL tsvector for full-text search' })
   searchVector?: any | null;
}