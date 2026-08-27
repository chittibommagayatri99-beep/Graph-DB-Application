import { Film } from "lucide-react";

interface Props {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
}

export function EmptyState({
  icon = <Film size={28} className="text-gray-600" />,
  title = "Nothing here yet",
  message = "No results to display.",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-elevated border border-surface-border flex items-center justify-center mb-4">
        {icon}
      </div>
      <h2 className="text-base font-semibold text-white mb-1">{title}</h2>
      <p className="text-muted max-w-sm">{message}</p>
    </div>
  );
}
