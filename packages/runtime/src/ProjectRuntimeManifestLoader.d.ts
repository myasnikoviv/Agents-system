import { ProjectRuntimeManifest } from './ProjectRuntimeManifest';
type LoaderOptions = {
    projectRoot?: string;
    preferCanonicalBundle?: boolean;
};
export declare function loadProjectRuntimeManifest(options?: LoaderOptions): Promise<ProjectRuntimeManifest>;
export {};
