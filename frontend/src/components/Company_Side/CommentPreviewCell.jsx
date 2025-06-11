import { Button } from "@/components/ui/button"
import { PencilLine } from "lucide-react"

export default function CommentPreviewCell({ lead, onEdit }) {
  // Get the comment from either notes array or commenti field
  const getComment = () => {
    if (lead.notes && lead.notes.length > 0) {
      return lead.notes[0].note || lead.notes[0].content;
    }
    return lead.commenti || '';
  };

  const comment = getComment();
  const hasComment = comment && comment.trim() !== '';

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-gray-50 p-2 rounded-md border border-gray-200 min-h-[60px] text-sm relative">
        {hasComment ? (
          <>
            <div className="max-h-[80px] overflow-auto pr-1 whitespace-pre-wrap">
              {comment}
            </div>
            {comment.length > 150 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none"></div>
            )}
          </>
        ) : (
          <span className="text-gray-400 italic">Nessun commento</span>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(lead)}
        className="w-full flex items-center justify-center gap-1"
      >
        <PencilLine className="h-4 w-4" />
        <span className="text-xs">{hasComment ? "Modifica" : "Aggiungi"}</span>
      </Button>
    </div>
  )
} 