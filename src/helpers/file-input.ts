import { fileTypeFromBuffer } from 'file-type';
import fs from 'fs/promises';

let fileInput;

function getHumanFileSize(input) {
  let sizeInBytes;
  if (typeof input === 'string') {
    sizeInBytes = Buffer.byteLength(input);
  } else if (Buffer.isBuffer(input)) {
    sizeInBytes = input.length;
  } else {
    return '?';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  let i = 0;
  while (sizeInBytes >= 1024 && i < units.length - 1) {
    sizeInBytes /= 1024;
    i++;
  }
  return `${sizeInBytes.toFixed(2)} ${units[i]}`;
}

export const readFilePath = async (filePath) => {
	const fileData = await fs.readFile(filePath);
    const type = await fileTypeFromBuffer(fileData);
    if (type) {
      // image file
      fileInput = {
        "image": /^image\//i.test(type.mime),
        data: fileData,
        type: type
      };
    } else {
      fileInput = {
        "text": true,
        data: fileData.toString('utf8')
      }
    }
    return fileInput;
}

export const fileInputSize = () => {
	return getHumanFileSize(fileInput.data);
}

export const getFileInput = () => {
	return fileInput;
};

export const readFileInput = async () => {
	if (!process.stdin.isTTY) {
		return await new Promise(async (resolve, reject) => {

		  let inputData = [];

		  // Read data from stdin (standard input)
		  process.stdin.on('data', (chunk) => {
		    inputData.push(chunk);
		  });

		  process.stdin.on('end', async () => {

		    // Concatenate the input data chunks
		    const fileData = Buffer.concat(inputData); // .toString('utf8');
		    

		    resolve(fileInput)
		  });

		  // Wait for user to end input (Ctrl+D)
		  process.stdin.resume();

		});
	}
  }