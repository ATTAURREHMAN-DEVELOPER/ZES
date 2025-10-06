import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader = ({ icon, title, subtitle, onBack, actions, className }: PageHeaderProps) => {
  return (
    <div className={cn('rounded-lg border bg-card text-card-foreground p-4 md:p-6 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">{icon}</div>}
          <div>
            <h2 className="text-xl md:text-2xl font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {onBack && (
            <Button variant="outline" onClick={onBack}>Back</Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageHeader;


