"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useContractsLoaded = useContractsLoaded;
const react_1 = require("react");
const ContractService_1 = require("../services/ContractService");
function useContractsLoaded({ notify }) {
    const [contractsLoaded, setContractsLoaded] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        ContractService_1.contractService.ensureLoaded()
            .then(() => setContractsLoaded(true))
            .catch((err) => {
            console.error('Failed to load contracts', err);
            notify('Failed to load contract registry', 'error');
        });
    }, [notify]);
    return { contractsLoaded };
}
