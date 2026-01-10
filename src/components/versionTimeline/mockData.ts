import type { TimelineData } from '../../types/versionTimeline'

// 模拟 Ubiquiti 时间轴数据（基于参考图）
export const ubiquitiTimelineData: TimelineData = {
  info: {
    title: '大事记',
    company: 'UBIQUITI NETWORKS',
  },
  events: [
    // 2003 年 - 上层
    {
      id: 'e1',
      year: 2003,
      title: 'Robert J. Pera 在苹果公司任职wifi硬件工程师',
      description: '他注意到苹果的设备突破功率远近低于FCC限制。他认为提高发射功率可以增强传输距离，实现有线无法到达的地区联网',
      type: 'milestone',
      position: 'top',
    },
    // 2005 年 - 上层
    {
      id: 'e2',
      year: 2005,
      title: 'Robert J. Pera 在加州成立Ubiquiti',
      description: '推出第一条产品线 "Super Range" 微型PCI无线电卡',
      type: 'milestone',
      position: 'top',
    },
    // 2005 年 - 下层
    {
      id: 'e3',
      year: 2005,
      title: '推出非标准频段的Xtreme Range系列室外无线产品',
      type: 'major',
      position: 'bottom',
    },
    // 2006 年 - 上层
    {
      id: 'e4',
      year: 2006,
      title: '意大利WISP使用XR5和35dBi螺旋天线创建304公里点对点链路4-5Mb/s通信速率的世界纪录',
      description: 'UBNT开始获得外界关注',
      type: 'milestone',
      position: 'top',
      highlight: ['世界纪录', 'UBNT'],
    },
    // 2007 年 - 下层
    {
      id: 'e5',
      year: 2007,
      title: '推出PowerStation',
      description: '业界首款具有集成天线设计的室外无线产品',
      type: 'major',
      position: 'bottom',
    },
    // 2008 年 - 上层
    {
      id: 'e6',
      year: 2008,
      title: '建立并开始运营Ubiquiti论坛',
      type: 'milestone',
      position: 'top',
      highlight: ['Ubiquiti论坛'],
    },
    // 2008 年 - 下层
    {
      id: 'e7',
      year: 2008,
      title: '推出airMAX®系列',
      description: 'WISP室外无线CPE产品线',
      type: 'major',
      position: 'bottom',
      highlight: ['airMAX®'],
    },
    // 2009 年 - 上层
    {
      id: 'e8',
      year: 2009,
      title: '在欧/亚/美洲陆续召开airMAX全球大会(AWC)',
      description: '后续升级为Ubiquiti全球大会',
      type: 'milestone',
      position: 'top',
    },
    // 2010 年 - 下层
    {
      id: 'e9',
      year: 2010,
      title: '推出UniFi®系列',
      description: '企业无线网络解决方案产品线',
      type: 'major',
      position: 'bottom',
      highlight: ['UniFi®'],
    },
    // 2011 年 - 上层
    {
      id: 'e10',
      year: 2011,
      title: '在NASDAQ上市',
      description: '代号UBNT，市值$14.4亿',
      type: 'milestone',
      position: 'top',
      highlight: ['UBNT', '$14.4亿'],
    },
    // 2012 年 - 下层
    {
      id: 'e11',
      year: 2012,
      title: '推出airFiber®系列',
      description: 'WISP室外无线回程链路产品线',
      type: 'major',
      position: 'bottom',
      highlight: ['airFiber®'],
    },
    // 2013 年 - 下层
    {
      id: 'e12',
      year: 2013,
      title: '推出EdgeMAX®系列',
      description: 'ISP边界网关/交换产品线；推出mFi®系列，家用IoT产品线',
      type: 'major',
      position: 'bottom',
      highlight: ['EdgeMAX®', 'mFi®'],
    },
    // 2015 年 - 上层
    {
      id: 'e13',
      year: 2015,
      title: '成立在线商城，实行线上直销',
      description: '已支持美国，现已支持加拿大、欧洲及日印等地区',
      type: 'milestone',
      position: 'top',
    },
    // 2015 年 - 下层
    {
      id: 'e14',
      year: 2015,
      title: '推出UniFi®Protect系列',
      description: '企业安防监控产品线',
      type: 'major',
      position: 'bottom',
      highlight: ['UniFi®Protect'],
    },
    // 2016 年 - 下层
    {
      id: 'e15',
      year: 2016,
      title: '推出AmpliFi®家用Mesh产品线',
      description: '推出SunMAX™住宅太阳能解决方案',
      type: 'major',
      position: 'bottom',
      highlight: ['AmpliFi®', 'SunMAX™'],
    },
    // 2017 年 - 下层
    {
      id: 'e16',
      year: 2017,
      title: '推出UFiber®系列',
      description: 'ISP有线光纤接入产品线',
      type: 'major',
      position: 'bottom',
      highlight: ['UFiber®'],
    },
    // 2018 年 - 下层
    {
      id: 'e17',
      year: 2018,
      title: '推出UniFi®LED系列',
      description: '企业照明解决方案',
      type: 'major',
      position: 'bottom',
      highlight: ['UniFi®LED'],
    },
    // 2020 年 - 上层
    {
      id: 'e18',
      year: 2020,
      title: '建立Ubiquiti学院',
      description: '发展认证计划：进行网络工程师培训及认证',
      type: 'milestone',
      position: 'top',
    },
    // 2020 年 - 下层
    {
      id: 'e19',
      year: 2020,
      title: '推出UniFi®Talk',
      description: '企业音视频解决方案；推出UniFi®Access，企业门禁解决方案；推出LTU™，WISP无线网桥产品线',
      type: 'major',
      position: 'bottom',
      highlight: ['UniFi®Talk', 'UniFi®Access', 'LTU™'],
    },
  ],
}

// 简化的示例数据（用于快速测试）
export const simpleTimelineData: TimelineData = {
  info: {
    title: '产品发展历程',
    company: 'Example Company',
  },
  events: [
    {
      id: 's1',
      year: 2018,
      title: '公司成立',
      description: '在深圳成立，专注于网络设备研发',
      type: 'milestone',
      position: 'top',
    },
    {
      id: 's2',
      year: 2018,
      title: '推出第一代路由器',
      description: '支持 Wi-Fi 5，双频并发',
      type: 'major',
      position: 'bottom',
      highlight: ['Wi-Fi 5'],
    },
    {
      id: 's3',
      year: 2019,
      title: '获得 A 轮融资',
      description: '融资金额 $5000万',
      type: 'milestone',
      position: 'top',
      highlight: ['$5000万'],
    },
    {
      id: 's4',
      year: 2020,
      title: '推出企业级交换机',
      description: '支持 PoE+，24 端口千兆',
      type: 'major',
      position: 'bottom',
      highlight: ['PoE+'],
    },
    {
      id: 's5',
      year: 2021,
      title: '海外市场拓展',
      description: '进入欧美市场，设立海外办事处',
      type: 'milestone',
      position: 'top',
    },
    {
      id: 's6',
      year: 2021,
      title: '推出 Wi-Fi 6 路由器',
      description: '支持最新 Wi-Fi 6E 标准',
      type: 'major',
      position: 'bottom',
      highlight: ['Wi-Fi 6', 'Wi-Fi 6E'],
    },
    {
      id: 's7',
      year: 2022,
      title: '上市',
      description: '在纳斯达克上市，市值 $20亿',
      type: 'milestone',
      position: 'top',
      highlight: ['$20亿'],
    },
    {
      id: 's8',
      year: 2023,
      title: '推出 Mesh 系统',
      description: '全屋覆盖解决方案',
      type: 'major',
      position: 'bottom',
      highlight: ['Mesh'],
    },
  ],
}
