import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import EditorPage from '@/pages/EditorPage';
import ListView from '@/pages/ListView';
export default function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(ListView, {}) }), _jsx(Route, { path: "/editor", element: _jsx(EditorPage, {}) }), _jsx(Route, { path: "/editor/:id", element: _jsx(EditorPage, {}) }), _jsx(Route, { path: "/404", element: _jsx(NotFound, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/404", replace: true }) })] }) }));
}
function NotFound() {
    return (_jsxs("div", { className: "flex h-screen flex-col items-center justify-center", children: [_jsx("h1", { className: "text-4xl font-bold text-neutral-300", children: "404" }), _jsx("p", { className: "mt-2 text-neutral-500", children: "Page not found" }), _jsx("a", { href: "/", className: "mt-4 text-sm text-blue-600 underline underline-offset-2 hover:text-blue-800", children: "Go back home" })] }));
}
