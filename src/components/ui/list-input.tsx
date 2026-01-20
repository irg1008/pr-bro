import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

interface ListInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  hideAddButton?: boolean;
}

export function ListInput({
  value,
  onChange,
  placeholder = "Enter item...",
  addLabel = "Add Item",
  hideAddButton = false
}: ListInputProps) {
  const handleAdd = () => {
    onChange([...value, ""]);
  };

  const handleRemove = (index: number) => {
    const newValue = [...value];
    newValue.splice(index, 1);
    onChange(newValue);
  };

  const handleChange = (index: number, text: string) => {
    const newValue = [...value];
    newValue[index] = text;
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      {value.map((item, index) => (
        <div
          key={index}
          className="flex gap-2 items-center slide-in-from-left-2 animate-in duration-200"
        >
          <span className="text-sm font-medium text-muted-foreground w-6 shrink-0 text-center">
            {index + 1}.
          </span>
          <Input
            value={item}
            onChange={(e) => handleChange(index, e.target.value)}
            placeholder={placeholder}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(index)}
            className="text-muted-foreground hover:text-destructive shrink-0"
            title="Remove step"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {!hideAddButton && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="ml-8" // clear numbering
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      )}
    </div>
  );
}
