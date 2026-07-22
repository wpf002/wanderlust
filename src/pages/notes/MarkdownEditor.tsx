import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";

/**
 * Thin wrapper around `@uiw/react-md-editor` (editor + its two stylesheets),
 * split into its own chunk so the markdown editor only loads on /notes.
 */
export default function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <MDEditor
      value={value}
      onChange={(v) => onChange(v || "")}
      preview="live"
      height={380}
      style={{ background: "transparent", boxShadow: "none" }}
      visibleDragbar={false}
    />
  );
}
