export default {
    apiServer: 'Api server url',
    timeout: 1000 * 10,
    toast(message: string) {
        console.error('error: ', message);
    },
} as const;
