import { type ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

interface AppShellProps {
    children: ReactNode;
    title: string;
    subtitle?: string;
}

export function AppShell({ children, title, subtitle }: AppShellProps) {
    return (
        <div className="min-h-screen bg-surface-secondary flex">
            <AppSidebar />
            {/* Main area — push by sidebar width via peer approach or fixed margin */}
            <div className="flex-1 ml-[260px] flex flex-col min-h-screen transition-all duration-300">
                <AppTopbar title={title} subtitle={subtitle} />
                <main className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                    {children}
                </main>
            </div>
        </div>
    );
}
