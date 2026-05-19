import { jsxs as _jsxs } from "react/jsx-runtime";
import { memo } from 'react';
import { Bot } from 'lucide-react';
import { BaseNode } from './BaseNode';
const LLMNode = memo(function LLMNode(props) {
    const data = props.data;
    return (_jsxs(BaseNode, { ...props, icon: Bot, children: [data.model && _jsxs("div", { className: "truncate", children: ["Model: ", data.model] }), data.prompt && (_jsxs("div", { className: "truncate max-w-[160px]", children: ["Prompt: ", data.prompt] }))] }));
});
export default LLMNode;
