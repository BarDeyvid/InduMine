import { cn } from "@/lib/utils";
import { t } from "@/i8n";

interface SpecsTableProps {
  specs: Record<string, string | null>;
  title?: string;
  className?: string;
}

export function SpecsTable({ specs, title, className }: SpecsTableProps) {
  // Filter out null/empty values
  const filteredSpecs = Object.entries(specs).filter(
    ([, value]) => value !== null && value !== '' && value !== undefined
  );

  if (filteredSpecs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        {t("specs_table.empty")}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {title && (
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      )}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <table className="w-full min-w-[300px] text-sm">
          <tbody>
            {filteredSpecs.map(([key, value], index) => (
              <tr
                key={key}
                className={cn(
                  "border-b border-border/50 transition-colors hover:bg-muted/30",
                  index === filteredSpecs.length - 1 && "border-b-0"
                )}
              >
                <td className="py-3 pr-4 text-muted-foreground font-medium whitespace-nowrap">
                  {key}
                </td>
                <td className="py-3 text-foreground font-semibold text-right">
                  {String(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
