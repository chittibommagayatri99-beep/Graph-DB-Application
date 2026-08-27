import { AlertTriangle, WifiOff } from "lucide-react";

interface Props {
  title?: string;
  message?: string;
  code?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  code,
}: Props) {
  const isDbDown = code === "DB_UNAVAILABLE";

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-800/40 flex items-center justify-center mb-4">
        {isDbDown ? (
          <WifiOff size={28} className="text-red-400" />
        ) : (
          <AlertTriangle size={28} className="text-red-400" />
        )}
      </div>
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <p className="text-muted max-w-sm">{message}</p>
      {isDbDown && (
        <p className="mt-2 text-xs text-gray-600">
          The graph database is temporarily unreachable. Please check your connection or try again shortly.
        </p>
      )}
    </div>
  );
}
