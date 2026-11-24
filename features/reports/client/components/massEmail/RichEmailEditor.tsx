/**
 * Simple formatted-text editor for mass email: headings, bold, italic, links,
 * images, lists. Produces HTML that the server sanitizes again before sending.
 */
import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { toast } from "sonner";
import {
  Bold, Italic, Heading1, Heading2, Heading3, Link as LinkIcon, Unlink, ImagePlus,
  List, ListOrdered, Quote, Undo2, Redo2, Loader2, Pilcrow,
} from "lucide-react";
import { trpc } from "@shared/lib/trpc";
import { Input } from "@shared/ui/input";
import { Button } from "@shared/ui/button";
import { prepareEmailImage } from "./prepareEmailImage";

function ToolButton({ label, active, disabled, onClick, children }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`h-8 w-8 inline-flex items-center justify-center rounded-sm transition-colors disabled:opacity-40 ${
        active ? "bg-[#9B4D19]/25 text-[#E0D3BD]" : "text-[#BABAAE] hover:bg-white/10 hover:text-[#E0D3BD]"
      }`}
    >
      {children}
    </button>
  );
}

const normalizeHref = (raw: string) => {
  const v = raw.trim();
  if (!v) return "";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  return `https://${v.replace(/^\/+/, "")}`;
};

function Toolbar({ editor, onPickImage, uploading }: { editor: Editor; onPickImage: () => void; uploading: boolean }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const applyLink = () => {
    const url = normalizeHref(href);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!url) chain.unsetLink().run();
    else if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: href.trim(), marks: [{ type: "link", attrs: { href: url } }] }).run();
    } else chain.setLink({ href: url }).run();
    setLinkOpen(false);
  };
  return (
    <div className="border-b border-[#57544E] bg-[#2B2823]">
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1" role="toolbar" aria-label="Formatting">
        <ToolButton label="Paragraph" active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()}><Pilcrow className="w-4 h-4" /></ToolButton>
        <ToolButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 className="w-4 h-4" /></ToolButton>
        <ToolButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="w-4 h-4" /></ToolButton>
        <ToolButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="w-4 h-4" /></ToolButton>
        <span className="w-px h-5 bg-[#57544E] mx-1" />
        <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="w-4 h-4" /></ToolButton>
        <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="w-4 h-4" /></ToolButton>
        <ToolButton label="Link" active={editor.isActive("link") || linkOpen} onClick={() => { setHref(editor.getAttributes("link").href ?? ""); setLinkOpen((v) => !v); }}><LinkIcon className="w-4 h-4" /></ToolButton>
        {editor.isActive("link") && <ToolButton label="Remove link" onClick={() => editor.chain().focus().extendMarkRange("link").unsetLink().run()}><Unlink className="w-4 h-4" /></ToolButton>}
        <ToolButton label="Insert image" disabled={uploading} onClick={onPickImage}>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}</ToolButton>
        <span className="w-px h-5 bg-[#57544E] mx-1" />
        <ToolButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="w-4 h-4" /></ToolButton>
        <ToolButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="w-4 h-4" /></ToolButton>
        <ToolButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote className="w-4 h-4" /></ToolButton>
        <span className="w-px h-5 bg-[#57544E] mx-1" />
        <ToolButton label="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 className="w-4 h-4" /></ToolButton>
        <ToolButton label="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 className="w-4 h-4" /></ToolButton>
      </div>
      {linkOpen && (
        <form className="flex gap-2 px-2 pb-2" onSubmit={(e) => { e.preventDefault(); applyLink(); }}>
          <Input autoFocus value={href} onChange={(e) => setHref(e.target.value)} placeholder="https://riverslodgehunt.com/… or name@example.com" className="h-8 text-sm" aria-label="Link address" />
          <Button type="submit" size="sm" className="h-8">Apply</Button>
          <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => setLinkOpen(false)}>Cancel</Button>
        </form>
      )}
    </div>
  );
}

export default function RichEmailEditor({ value, onChange, disabled }: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = trpc.reports.newsletters.uploadImage.useMutation();
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, code: false, codeBlock: false, strike: false }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ["mailto", "tel"], HTMLAttributes: { rel: null, target: null } }),
      Image.configure({ inline: false }),
    ],
    content: value,
    editable: !disabled,
    editorProps: { attributes: { class: "email-editor-content", "aria-label": "Email body", "data-testid": "email-body-editor" } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Load new content when a different email is opened.
  useEffect(() => {
    if (editor && value !== editor.getHTML() && !(value === "" && editor.isEmpty)) editor.commands.setContent(value, false);
  }, [editor, value]);
  useEffect(() => { editor?.setEditable(!disabled); }, [editor, disabled]);

  const onFile = async (file: File | undefined) => {
    if (!file || !editor) return;
    setUploading(true);
    try {
      const prepared = await prepareEmailImage(file);
      const { url } = await upload.mutateAsync({ fileName: prepared.fileName, contentType: prepared.contentType, fileData: prepared.base64 });
      editor.chain().focus().setImage({ src: url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The image couldn't be added.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (!editor) return <div className="h-72 border border-[#57544E] bg-[#2B2823] animate-pulse" />;
  return (
    <div className="border border-[#57544E] bg-[#2B2823] focus-within:ring-1 focus-within:ring-[#9B4D19]">
      {!disabled && <Toolbar editor={editor} uploading={uploading} onPickImage={() => fileRef.current?.click()} />}
      <EditorContent editor={editor} />
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" className="hidden" data-testid="email-image-input" onChange={(e) => onFile(e.target.files?.[0])} />
    </div>
  );
}
