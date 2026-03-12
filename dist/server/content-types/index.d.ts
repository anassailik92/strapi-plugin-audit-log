declare const _default: {
    'audit-log': {
        schema: {
            kind: string;
            collectionName: string;
            info: {
                singularName: string;
                pluralName: string;
                displayName: string;
                description: string;
            };
            options: {
                draftAndPublish: boolean;
            };
            pluginOptions: {
                "content-manager": {
                    visible: boolean;
                };
            };
            attributes: {
                action: {
                    type: string;
                    enum: string[];
                    required: boolean;
                };
                contentType: {
                    type: string;
                    required: boolean;
                };
                entityId: {
                    type: string;
                };
                userId: {
                    type: string;
                };
                userEmail: {
                    type: string;
                };
                userName: {
                    type: string;
                };
                before: {
                    type: string;
                };
                after: {
                    type: string;
                };
                ip: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map