/// <reference types="vite/client" />

declare module "*.css";

declare module "*.goose" {
  const content: string;
  export default content;
}
