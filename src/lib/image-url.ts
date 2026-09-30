export function imageVariant(url: string, size: number) {
    return url.replace("/upload", `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}