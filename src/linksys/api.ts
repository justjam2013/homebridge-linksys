import axios from 'axios';
import { AxiosRequestConfig } from 'axios';

export class LinksysAPI {
  private ip = 'http://192.168.1.1/';
  private password = '';

  constructor(ip: string, password: string) {
    this.ip = ip;
    this.password = password;

    if (!this.ip.endsWith('/')) {
      this.ip = this.ip + '/';
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  async sendRequest(action: string, authorize?: boolean): Promise<any> {
    const b64 = Buffer.from('admin:' + this.password).toString('base64');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const headers: any = {
      'Content-Type': 'application/json',
      'X-JNAP-Action': `http://linksys.com/jnap/${action}`,
      'X-JNAP-Authorization': `Basic ${b64}`,
    };

    const req: AxiosRequestConfig = {
      method: 'POST',
      url: `${this.ip}JNAP/`,
      data: {},
      headers,
    };

    return (await axios(req)).data;
  }
}
