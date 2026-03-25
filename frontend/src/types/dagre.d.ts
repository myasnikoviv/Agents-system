declare module 'dagre' {
  const dagre: {
    graphlib: {
      Graph: new () => {
        setGraph: (config: Record<string, unknown>) => void;
        setDefaultEdgeLabel: (cb: () => Record<string, unknown>) => void;
        setNode: (id: string, config: Record<string, unknown>) => void;
        setEdge: (source: string, target: string) => void;
        node: (id: string) => { x: number; y: number };
      }
    };
    layout: (g: unknown) => void;
  };
  export default dagre;
}
