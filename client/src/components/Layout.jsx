import React from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

const Layout = ({ children }) => {
    return (
        <div className="flex min-h-screen bg-slate-950">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopNavbar />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#020617]">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
