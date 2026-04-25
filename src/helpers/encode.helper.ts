import { isString } from "class-validator";

export class EncodeHelper {
    static encodeFrom(offset: number): string {
        const n = (offset * 1) ^ 0x5a5a5a5a;
        const a = (n >>> 0).toString(36);
        const b = (((n >>> 0) * 2654435761) >>> 0).toString(36);
        return `v1_${(a + '-' + b).split('').reverse().join('')}_k3`;
    }

    static decodeFrom(from?: string): number {
        if (!from) {
            return 0;
        }
        if (!isString(from)) {
            return 0;
        }
        try {
            const parts = from.split('_');
            if (parts.length < 3 || parts[0] !== 'v1' || parts[2] !== 'k3') {
                return 0;
            }
            const payload = parts[1].split('').reverse().join('');
            const [a] = payload.split('-');
            const n = parseInt(a, 36);
            if (!Number.isFinite(n)) {
                return 0;
            }
            const offset = (n ^ 0x5a5a5a5a) >>> 0;
            return offset;
        } catch {
            return 0;
        }
    }
}
