import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { BaseNode } from './BaseNode';
const AIProcessorNode = memo(function AIProcessorNode(props) {
    return _jsx(BaseNode, { ...props, icon: Sparkles });
});
export default AIProcessorNode;
