import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { Code } from 'lucide-react';
import { BaseNode } from './BaseNode';
const CodeNode = memo(function CodeNode(props) {
    const data = props.data;
    return (_jsx(BaseNode, { ...props, icon: Code, children: data.code && (_jsx("div", { className: "font-mono truncate max-w-[160px]", children: data.code.slice(0, 50) })) }));
});
export default CodeNode;
