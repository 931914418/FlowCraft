import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
export function FieldInput({ value, onChange, onBlur, suggestions = [], placeholder }) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(e) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const handleSelect = useCallback((suggestion) => {
        onChange(suggestion);
        setShowSuggestions(false);
        onBlur();
    }, [onChange, onBlur]);
    return (_jsxs("div", { ref: wrapperRef, className: "relative", children: [_jsx(Input, { value: value, onChange: (e) => onChange(e.target.value), onFocus: () => suggestions.length > 0 && setShowSuggestions(true), onBlur: () => {
                    onBlur();
                    setTimeout(() => setShowSuggestions(false), 150);
                }, placeholder: placeholder }), showSuggestions && suggestions.length > 0 && (_jsx("div", { className: "absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg", children: suggestions.map((s) => (_jsx("button", { type: "button", className: "w-full px-3 py-1.5 text-left text-sm hover:bg-slate-50", onMouseDown: () => handleSelect(s), children: s }, s))) }))] }));
}
