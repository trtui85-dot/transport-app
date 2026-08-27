"use client";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

export default function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-sand/40 flex items-center justify-center text-ink/25 mb-4">
        {icon}
      </div>
      <h3 className="text-base font-medium text-ink/50">{title}</h3>
      {description && (
        <p className="text-sm text-ink/30 mt-1.5 max-w-xs leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
