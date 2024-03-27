import os from 'os';
import path from 'path';
import i18n from './i18n';

export function detectShell() {
  try {
    return JSON.stringify({
      shell_type: (os.platform() === 'win32') ? 'powershell' : path.basename(os.userInfo().shell ?? 'bash'),
      type: os.type(),
      release: os.release(),
      platform: os.platform(),
      architecture: os.arch(),
      cpus: os.cpus().map((cpu) => ({
        model: cpu.model,
        speed: cpu.speed,
        times: cpu.times,
      })),
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
      },
      networkInterfaces: os.networkInterfaces(),
      userInfo: {
        username: os.userInfo().username,
        shell: path.basename(os.userInfo().shell ?? 'bash'),
      },
      version: os.version(),
    });
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new Error(
        `${i18n.t('OS information retrieval failed unexpectedly')}: ${err.message}`
      );
    }
  }
}
