// ==UserScript==
// @name         浙里学习
// @namespace    https://bbs.tampermonkey.net.cn/
// @version      2025
// @description  郑重声明：本脚本不得实际将其用于各类学习网站进行刷课行为，不得实际在网站上运行此代码，不得使用本脚本进行收付费活动
// @author       E53787
// @run-at       document-start
// @match        https://www.zjce.gov.cn/*
// @match        https://*.zjce.gov.cn/*
// @require      https://scriptcat.org/lib/637/1.4.3/ajaxHooker.js
// @require      https://scriptcat.org/lib/1167/1.0.0/%E8%84%9A%E6%9C%AC%E7%8C%ABUI%E5%BA%93.js
// @require      https://scriptcat.org/lib/513/2.0.0/ElementGetter.js
// @grant        GM_xmlhttpRequest
// @connect      www.zjce.gov.cn  
// @connect      oapi.dingtalk.com
// @grant        GM_setValue
// @grant        GM_getValue 

// ==/UserScript==

(async function () {
    let user, address
    (window.unsafeWindow || window).CAT_UI = CAT_UI
    const learnstatus = GM_getValue('learnstatus')
    //    console.log("开始GM_getValue('learnstatus'):",GM_getValue('learnstatus'))
    if (learnstatus == undefined) {
        GM_setValue('learnstatus', false)
    }
    function getUrlParams() {
        const urlParams = new URLSearchParams(window.location.search)
        const params = {}
        for (const [key, value] of urlParams.entries()) {
            params[key] = value
        }
        const regex = /\/([^/?]+)\?/
        const match = window.location.href.match(regex)
        if (match && match[1]) {
            params["videoid"] = match[1]
        }
        return params
    }
    //获取当前界面的token
    function gettoken() {
        let cookies = document.cookie
        // console.log(cookies)

        // 如果你想对获取到的Cookie进行进一步处理，比如解析成对象形式以便更方便地操作各个Cookie项
        function parseCookies() {
            let cookieObj = {}
            let cookiesArray = cookies.split(';')
            for (let i = 0; i < cookiesArray.length; i++) {
                let cookie = cookiesArray[i].trim()
                let [name, value] = cookie.split('=')
                cookieObj[name] = value
            }
            return cookieObj
        }

        let parsedCookies = parseCookies()
        // console.log(parsedCookies)
        return parsedCookies.portalToken
    }

    //获取用户信息
    function getuser() {
        return new Promise(resolve => {
            const baseurl = "https://www.zjce.gov.cn/gateway/user/portal/sys/user/info"
            const timetemp = Date.now()
            let url = `${baseurl}?t=${timetemp}`
            // console.log(url)
            const token = gettoken()
            const platform = GM_getValue("platform")
            const headers = {
                Accept: "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                Authorization: token,
                Connection: "keep - alive",
                Cookie: document.cookie,
                Host: "www.zjce.gov.cn",
                Referer: "https://www.zjce.gov.cn/personalCenter/creditArchive",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
                platform: platform,
                "sec-ch-ua": '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "Windows"
            }
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: headers,

                onload: function (response) {
                    const data = JSON.parse(response.responseText)
                    // console.log(data)
                    if (data.code === 401) {
                        resolve(setTimeout(() => CAT_UI.Message.success(data.msg)))

                    } else if (data.code === 0) {
                        resolve(data.data)
                    }


                }
            })
        })
    }
    //获取用户的培训任务
    function gettriantask() {
        return new Promise(resolve => {
            const baseurl = "https://www.zjce.gov.cn/gateway/resource/portal/userCode/trainCodeInfo"
            const timetemp = Date.now()
            let url = `${baseurl}?t=${timetemp}`
            // console.log(url)
            const token = gettoken()
            const platform = GM_getValue("platform")
            const headers = {
                Accept: "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                Authorization: token,
                Connection: "keep - alive",
                Cookie: document.cookie,
                Host: "www.zjce.gov.cn",
                Referer: "https://www.zjce.gov.cn/personalCenter/creditArchive",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
                platform: platform,
                "sec-ch-ua": '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "Windows"
            }
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: headers,

                onload: function (response) {
                    const data = JSON.parse(response.responseText)
                    // console.log(data)
                    if (data.code === 401) {
                        resolve(setTimeout(() => CAT_UI.Message.success(data.msg)))

                    } else if (data.code === 0) {
                        resolve(data.data)
                    }
                }
            })
        })

    }
    //用户是否完成本年度网络自学学习数
    function getTask(taskdata) {
        let tasknum = 0
        let learnnum = 0
        for (let i = 0; i < taskdata.codeRuleList.length; i++) {
            if (taskdata.codeRuleList[i].codeRule === '网络自学学时数') {
                const { examCreditStr, gainCredit } = taskdata.codeRuleList[i]
                tasknum = examCreditStr
                learnnum = gainCredit
            }
        }
        if (learnnum >= parseFloat(tasknum)) {
            return true
        } else {
            return false
        }
    }
    //获取课程列表，默认获取100节课程信息
    function getclasslist() {
        return new Promise((resolve, reject) => {
            const baseurl = "https://www.zjce.gov.cn/gateway/data/index/video/page?sort=DESC&page=1&limit=100"
            const timetemp = Date.now()
            let url = `${baseurl}&t=${timetemp}`
            // console.log(url)
            const token = gettoken()
            const platform = GM_getValue("platform")
            const headers = {
                Accept: "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                Authorization: token,
                Connection: "keep - alive",
                Cookie: document.cookie,
                Host: "www.zjce.gov.cn",
                Referer: "https://www.zjce.gov.cn/personalCenter/creditArchive",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
                platform: platform,
                "sec-ch-ua": '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "Windows"
            }
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                headers: headers,

                onload: function (response) {
                    const data = JSON.parse(response.responseText)
                    // console.log(data)
                    if (data.code === 401) {
                        resolve(setTimeout(() => CAT_UI.Message.success(data.msg)))

                    } else if (data.code === 0) {
                        resolve(data.data)
                    }
                }
            })


        })
    }
    //开始学习！
    async function opennewtab(classlist) {
        function getclassdata(url, headers, classuuid) {
            // console.log('opentab执行')
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: headers,
                    onload: function (response) {
                        const data = JSON.parse(response.responseText)
                        // console.log("data:",data)
                        if(data.code===2005){
                            resolve("没有学习")
                        }
                        const { videos } = data.data
                        // console.log("videos:",videos)
                        if (videos.length > 0) {
                            for (let j = 0; j < videos.length; j++) {
                                if (videos[j]?.progress === 100) {
                                    //已完成
                                } else {
                                    //浙里学习未完成
                                    const runurl = window.location.href
                                    console.log('runurl:',runurl)
                                    if (runurl.indexOf("https://www.zjce.gov.cn/videos/detail") != "0") {
                                        console.log('准备跳转')
                                        window.open(`https://www.zjce.gov.cn/videos/detail/${classuuid}?bizType=1&playId=${videos[j]?.uuid}`, '_self')
                                        resolve("正在学习")
                                        break
                                    }
                                }
                            }
                            resolve("没有学习")
                        }
                    }
                })
            })
        }


        const { records } = classlist
        //遍历每一个课程，寻找未完成的课程
        for (let i = 0; i < records.length; i++) {
            const classuuid = records[i].uuid
            const baseurl = `https://www.zjce.gov.cn/gateway/resource/portal/video/info/info?uuid=${classuuid}&bizType=1`
            const timetemp = Date.now()
            let url = `${baseurl}&t=${timetemp}`
            const token = gettoken()
            const platform = GM_getValue("platform")
            const headers = {
                Accept: "application/json, text/plain, */*",
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                Authorization: token,
                Connection: "keep - alive",
                Cookie: document.cookie,
                Host: "www.zjce.gov.cn",
                Referer: "https://www.zjce.gov.cn/personalCenter/creditArchive",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
                platform: platform,
                "sec-ch-ua": '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "Windows"
            }
            const learn = await getclassdata(url, headers, classuuid)
            if (learn === "正在学习") {
                console.log("已经开始学习，直接跳出这个循环")
                break
            }
        }


    }

    //UI界面
    CAT_UI.createPanel({
        // 强制固定Drawer
        appendStyle: `.arco-drawer-wrapper {
      position: fixed !important;
    }`,
        header: {
            title: CAT_UI.Space(
                [
                    CAT_UI.Icon.ScriptCat({
                        style: { width: "24px", verticalAlign: "middle" },
                        draggable: "false",
                    }),
                    CAT_UI.Text("浙里学习2025", {
                        style: { fontSize: "16px" },
                    }),
                ],
                { style: { marginLeft: "5px" } }
            ),
            style: { borderBottom: "1px solid var(--color-neutral-3)" },
        },
        render: DM,
    })


    function DM() {
        const [visible, setVisible] = CAT_UI.useState(false)
        const [username, setusername] = CAT_UI.useState("")
        const [workaddress, setworkaddress] = CAT_UI.useState("")
        const [mubiao, setmubiao] = CAT_UI.useState("")
        const [yiwancheng, setyiwancheng] = CAT_UI.useState("")
        const [learnstatus, setlearnstatus] = CAT_UI.useState("")
        const [learntext, setlearntext] = CAT_UI.useState("")
        // let learnstatus = GM_getValue('learnstatus')
        CAT_UI.useEffect(() => {

            const ltext = GM_getValue('learnstatus') === false ? '开始学习' : '结束学习'
            console.log("GM_getValue('learnstatus'):", GM_getValue('learnstatus'))
            setlearntext(ltext)
            const a = getuser().then(res => {
                setusername(res.userName)
                setworkaddress(res.unitPosition)
                user = res.userName
                address = res.unitPosition
                const b = gettriantask().then(resu => {
                    return new Promise((resolve, reject) => {
                        let tasknum = 0
                        let learnnum = 0
                        for (let i = 0; i < resu.codeRuleList.length; i++) {
                            if (resu.codeRuleList[i].codeRule === '网络自学学时数') {
                                const { examCreditStr, gainCredit } = resu.codeRuleList[i]
                                setmubiao(examCreditStr)
                                setyiwancheng(gainCredit)
                                tasknum = examCreditStr
                                learnnum = gainCredit
                                resolve({ examCreditStr, gainCredit })
                            }
                        }

                    })

                    // console.log("resu:", resu)
                }).then((resx) => {
                    const { yiwancheng, mubiao } = resx
                    const a = GM_getValue('learnstatus')
                    console.log("a:", a)
                    if (a) {
                        if (yiwancheng >= parseInt(mubiao)) {
                            console.log("yiwancheng:", resx)
                            console.log("mubiao:", resx)
                            CAT_UI.Message.success(`学习完成!`)
                            setlearntext('开始学习')
                            console.log('学习完成')
                            GM_setValue('learnstatus', false)
                        } else {
                            setlearntext('结束学习')
                            GM_setValue('learnstatus', true)
                            main()
                        }
                    }
                })
            })


            //   console.log(a)
        }, [])
        return CAT_UI.Space([
            CAT_UI.Text(`用户:${username}`, {
                style: { fontSize: "16px" },
            }),
            // CAT_UI.Divider(null, { type: "horizontal" }),
            CAT_UI.Text(`单位:${workaddress}`, {
                style: { fontSize: "16px" },
            }),
            CAT_UI.Text(`目标:${mubiao}`, {
                style: { fontSize: "16px" },
            }),
            CAT_UI.Text(`当前:${yiwancheng}`, {
                style: { fontSize: "16px" },
            }),
            CAT_UI.Text(`完成:${yiwancheng >= mubiao ? "已完成" : "未完成"}`, {
                style: { fontSize: "16px" },
            }),
            CAT_UI.Button(learntext, {
                type: "primary",
                onClick: () => {
                    const learnstatus = GM_getValue('learnstatus')
                    if (learnstatus === false) {
                        if (yiwancheng >= mubiao) {
                            CAT_UI.Message.success(`学完了！`)
                            setlearntext('开始学习')
                            GM_setValue('learnstatus', false)
                        } else {
                            setlearntext('结束学习')
                            GM_setValue('learnstatus', true)
                            main()
                        }
                    }else{
                        GM_setValue('learnstatus', false)
                        setlearntext('开始学习')
                    }

                },
            }),
        ], {
            direction: "vertical",
        })
    }


    ajaxHooker.hook(request => {
        if (request.url.indexOf('https://www.zjce.gov.cn/gateway/resource/portal/pub/banner/list') != -1) {
            const header = request.headers
            console.log(header)
            const platform = header.platform
            GM_setValue('platform', platform)
            // setTimeout(() => CAT_UI.Message.success(`platform获取成功:${platform}`))
        }
    })
    async function main() {
        const runurl = window.location.href
        const userdata = await getuser()
        console.log(userdata)
        //获取当前用户的信息
        const { unitPosition, userName, uuid } = userdata
        console.log(unitPosition, userName, uuid)
        //获取用户任务完成情况
        const taskdata = await gettriantask()
        // console.log(taskdata.codeRuleList)

        const isover = getTask(taskdata)
        // if (isover) {
        //   console.log('任务完成')
        //   return setTimeout(() => CAT_UI.Message.success("你的网络自学已经完成，脚本将自动退出！"))
        // }
        const classlist = await getclasslist()

        opennewtab(classlist)
        console.log(classlist)

    }

    // if (runurl.indexOf("https://www.zjce.gov.cn/home") == "0") {
    //   //这里是首页

    // }


    const runurl = window.location.href
    if (runurl.indexOf("https://www.zjce.gov.cn/videos/detail") == "0" && GM_getValue('learnstatus')) {


        //获取当前视频的完成情况
        function getVideoStatus(uuid, playid) {
            return new Promise(resolve => {
                const baseurl = "https://www.zjce.gov.cn/gateway/resource/portal/video/info/info"
                const timetemp = Date.now()
                let url = `${baseurl}?uuid=${uuid}&bizType=1&videoId=${playid}&t=${timetemp}`
                // console.log(url)
                const token = gettoken()
                const platform = GM_getValue("platform")
                const headers = {
                    Accept: "application/json, text/plain, */*",
                    "Accept-Encoding": "gzip, deflate, br, zstd",
                    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
                    Authorization: token,
                    Connection: "keep - alive",
                    Cookie: document.cookie,
                    Host: "www.zjce.gov.cn",
                    Referer: "https://www.zjce.gov.cn/personalCenter/creditArchive",
                    "Sec-Fetch-Dest": "empty",
                    "Sec-Fetch-Mode": "cors",
                    "Sec-Fetch-Site": "same-origin",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
                    platform: platform,
                    "sec-ch-ua": '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                    "sec-ch-ua-mobile": "?0",
                    "sec-ch-ua-platform": "Windows"
                }
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: headers,

                    onload: function (response) {
                        const data = JSON.parse(response.responseText)
                        // console.log(data)
                        if (data.code === 401) {
                            resolve(setTimeout(() => CAT_UI.Message.success(data.msg)))

                        } else if (data.code === 0) {
                            resolve(data.data)
                        }
                    }
                })
            })
        }


        //这里是视频播放界面

        const videodiv = await elmGetter.get('video')
        console.log(videodiv)
        //5秒重新点击播放按钮
        const inter = setInterval(function () {
            videodiv.playbackRate = 1
            videodiv.muted = true
            videodiv.play()
        }, 5000)
        //10分钟检测一次当前视频是否满分
        const inter2 = setInterval(async function () {

            const params = getUrlParams()
            // console.log(params)
            const videostatus = await getVideoStatus(params.videoid, params.playId)
            console.log(videostatus.progress)
            if (videostatus.progress === 100) {
                //已完成当前视频的任务，跳转回到课程列表
                clearInterval(inter)
                clearInterval(inter2)
                window.open(`https://www.zjce.gov.cn/home`, '_self')
            } else {

            }
        }, 5000)

        const params = getUrlParams()
        // console.log(params)
        const videostatus = await getVideoStatus(params.videoid, params.playId)
        console.log(videostatus.progress)
        // Video.volume=0.1 

        videodiv.addEventListener("ended", async function () {
            //播放完成的时候，需要检测当前学习的课程是否已经学到100%
            console.log("播放结束")
            const params = getUrlParams()
            const videostatus = await getVideoStatus(params.videoid, params.playId)
            console.log(videostatus.progress)
            if (videostatus.progress === 100) {
                //已完成当前视频的任务，跳转回到课程列表
                clearInterval(inter)
                clearInterval(inter2)
                
                window.open(`https://www.zjce.gov.cn/home`, '_self')
            } else {
                //继续播放
                videodiv.playbackRate = 4
                videodiv.muted = true
                videodiv.play()
                console.log("重新播放")
            }
        }, false)

    }

})()