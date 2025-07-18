export interface PageConfig {
  size: string;
  orientation: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface TypographyConfig {
  font_family: string;
  font_size: number;
  line_height: number;
  text_color: string;
}

export interface HeadingConfig {
  font_size: number;
  font_weight: string;
  margin_top: number;
  margin_bottom: number;
  alignment: string;
}

export interface StyleConfig {
  [key: string]: any;
  page: PageConfig;
  typography: TypographyConfig;
  headings: {
    h1: HeadingConfig;
    h2: HeadingConfig;
    h3: HeadingConfig;
  };
  paragraph: Record<string, any>;
  lists?: Record<string, any>;
  citations?: Record<string, any>;
  header_footer?: Record<string, any>;
}