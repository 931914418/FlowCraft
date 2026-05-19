import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Globe } from 'lucide-react';
import { BaseNode } from './BaseNode';
const HttpNode = memo(function HttpNode(props) {
    const data = props.data;
    return (_jsxs(BaseNode, { ...props, icon: Globe, children: [data.method && _jsx("span", { className: "font-mono uppercase", children: data.method }), data.url && _jsx("div", { className: "truncate max-w-[160px]", children: data.url })] }));
});
export default HttpNode;
