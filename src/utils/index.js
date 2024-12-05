/*
 * @Author: Libra
 * @Date: 2024-12-04 16:39:07
 * @LastEditors: Libra 97220040@qq.com
 * @Description: 
 */
import fs from 'fs/promises';

const readConfig = async () => {
  const configContent = await fs.readFile('config/exam-config.json', 'utf-8');
  return JSON.parse(configContent);
};

export { readConfig };