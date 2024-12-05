/*
 * @Author: Libra 97220040@qq.com
 * @Date: 2024-12-04 16:29:16
 * @LastEditors: Libra 97220040@qq.com
 * @LastEditTime: 2024-12-04 17:05:16
 * @FilePath: /offline-create-exam/src/utils/request.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import axios from 'axios';
import { readConfig } from './index.js';

let instance = null;

const createInstance = async () => {
  if (instance) return instance;

  const config = await readConfig();
  
  // 创建axios实例
  instance = axios.create({
    baseURL: config.apiBaseUrl,
    headers: {
      'Content-Type': 'application/json',
      ...(config.token && { Authorization: `Bearer ${config.token}` })
    },
    timeout: 30000
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => {
      const { data } = response;
      // 如果返回的是错误消息，则抛出错误
      if (data.code !== 0) {
        return Promise.reject(new Error(data.message || '请求失败'));
      }
      // 直接返回数据
      return data;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  return instance;
};

// 封装请求方法
export const get = async (url, params = {}) => {
  const inst = await createInstance();
  return inst.get(url, { params });
};

export const post = async (url, data = {}) => {
  const inst = await createInstance();
  return inst.post(url, data);
};

export const put = async (url, data = {}) => {
  const inst = await createInstance();
  return inst.put(url, data);
};

export const del = async (url) => {
  const inst = await createInstance();
  return inst.delete(url);
};

// 导出获取实例的方法，以便需要时可以直接使用或配置
export default createInstance;