/** Read a user-selected image as a data URL for preview and upload. */
export function pickImage(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.hidden = true;
    const finish = (value: string | null) => {
      input.remove();
      resolve(value);
    };
    input.addEventListener('cancel', () => finish(null), { once: true });
    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];
        if (!file) {
          finish(null);
          return;
        }
        if (!file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) {
          input.remove();
          reject(new Error('Choose an image smaller than 5 MB.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => finish(String(reader.result));
        reader.onerror = () => {
          input.remove();
          reject(new Error('Could not read the photo.'));
        };
        reader.readAsDataURL(file);
      },
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
  });
}
