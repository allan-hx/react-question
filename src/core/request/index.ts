import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { store, tokenAtom } from "@/store";
import config from '@/config';

const instance = axios.create({
  baseURL: config.apiServer,
});

export type Response<T> =
  | {
    data: T;
    success: true;
    errorCode?: string;
    errorMessage?: string;
  }
  | {
    data?: T;
    success: false;
    errorCode: number;
    errorMessage: string;
  };

type ExtractKeys<T extends string> =
  T extends `${string}{${infer Key}}${infer Rest}`
  ? Key | ExtractKeys<Rest>
  : never;

type PathVariables<T extends string> = ExtractKeys<T> extends never
  ? Record<string, string | number>
  : Record<ExtractKeys<T>, string | number>;

type RequestConfig<
  D extends object,
  Q extends object,
  U extends string,
  P = PathVariables<U>
> = Omit<AxiosRequestConfig<D>, "url" | "params"> & {
  /**
   * @example '/api/:id' => pathVariables: { id: "1" }
   * @example '/api/:id/:name' => pathVariables: { id: "1", name: "2" }
   */
  url: U;
  ignoreAuth?: boolean; //不為true時 header需附帶Authentication value為token
  silentError?: boolean;
  throwError?: boolean;
  params?: Q;
  /**
   * @example '/api/:id' => { id: "1" }
   * @example '/api/:id/:name' => { id: "1", name: "2" }
   */
  pathVariables?: P;
};

export interface Request {
  <
    T,
    D extends object = any,
    Q extends object = any,
    U extends string = string,
    P = PathVariables<U>
  >(
    args: RequestConfig<D, Q, U, P>
  ): Promise<Response<T>>;
}

const request: Request = async <
  T = any,
  D extends object = any,
  Q extends object = any,
  U extends string = string,
  P = PathVariables<U>
>(
  args: RequestConfig<D, Q, U, P>
) => {
  const { url, pathVariables, ignoreAuth, headers, silentError, throwError, ...options } = args;
  // url参数匹配
  const _url = typeof pathVariables === 'object' ? url.replace(/:(\w+)/g, (item, key) => {
    const value = (pathVariables as Record<any, any>)[key];
    return value !== undefined ? value.toString() : item;
  }) : url;

  // 是否添加身份验证
  const _headers = { ...(args.headers ?? {}) };

  if (!ignoreAuth) {
    const token = store.get(tokenAtom);

    if (!token) {
      _headers.Authentication = token;
    }
  }

  try {
    const result = await instance.request<Response<T>>({
      url: _url,
      headers: _headers,
      ...options,
    });

    return result.data;
  } catch (error) {
    const _error = error as AxiosError<Response<T>, D>;
    const result = _error.response?.data ?? (_error.response ?? {
      data: null,
      success: false,
      errorCode: _error.status,
      errorMessage: 'Network error',
    }) as Response<T>;

    // 清除本地token
    if (result.errorCode === '登陆失效的code') {
      store.set(tokenAtom, undefined);
      config.toast('Login has expired');
      // 做登陆失效跳转和相关处理
    } else if (!!throwError) {
      throw result;
    } else if (!silentError) {
      // 关于message，可以通过errorCode来动态提示
      config.toast(result.errorMessage!);
    }

    return result;
  }
};

export default request;
