import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from 'react';
import { Table2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
const DataMapperNode = memo(function DataMapperNode(props) {
    return _jsx(BaseNode, { ...props, icon: Table2 });
});
export default DataMapperNode;
