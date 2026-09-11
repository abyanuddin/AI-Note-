"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import UnderlineExt from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import { useEffect } from "react";
import {
  Bold, Italic, Underline, List, ListOrdered, Heading2, Quote,
  Undo, Redo, Highlighter, CheckSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TiptapEditorProps {
  content: string;
  onUpdate: (html: string) => void;
  editorRef: React.MutableRefObject<any>;
}

export default function TiptapEditor({ content, onUpdate, editorRef }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing your notes here... Use the insert buttons above to pull in AI content." }),
      UnderlineExt,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: content || "",
    onUpdate: ({ editor: e }) => {
      onUpdate(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: "min-h-[300px] outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
    }
  }, [editor, editorRef]);

  if (!editor) return <div className="h-64 bg-muted/30 rounded-lg animate-pulse" />;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-border">
        <ToolButton icon={Bold} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolButton icon={Italic} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolButton icon={Underline} active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
        <ToolButton icon={Highlighter} active={editor.isActive("highlight")} onClick={() => editor.chain().focus().toggleHighlight().run()} />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolButton icon={Heading2} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolButton icon={List} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolButton icon={ListOrdered} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolButton icon={CheckSquare} active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} />
        <ToolButton icon={Quote} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <div className="w-px h-5 bg-border mx-1" />
        <ToolButton icon={Undo} active={false} onClick={() => editor.chain().focus().undo().run()} />
        <ToolButton icon={Redo} active={false} onClick={() => editor.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolButton({ icon: Icon, active, onClick }: { icon: any; active: boolean; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 w-8 p-0 ${active ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
      onClick={onClick}
    >
      <Icon className="h-3.5 w-3.5" />
    </Button>
  );
}
