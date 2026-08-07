/** Public API — widgets/knowledge (FS7). Reader/AddSource/Ask are lazy leaves
 * reached through KnowledgeView; only the shell surface is public. */
export { KnowledgeView, type KnowledgeInitial } from './KnowledgeView';
export { RetrievalHonesty } from './RetrievalHonesty';
export { demoteMarkdownHeadings } from './markdown-embed';
