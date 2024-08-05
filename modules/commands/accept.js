module.exports.config = {
    name: "accept",
    version: "1.0.1",
    hasPermssion: 2,
    credits: "Aki Hayakawa",
    description: "Accept/Decline Incoming Bot Friend Requests",
    usePrefix: true,
    commandCategory: "system",
    usages: "uid",
    cooldowns: 0
  };
  
  module.exports.handleReply = async ({
    handleReply,
    event,
    api
  }) => {
    const {
      author,
      listRequest
    } = handleReply;
    if (author != event.senderID) return;
    const args = event.body.replace(/ +/g, " ").toLowerCase().split(" ");
  
    const form = {
      av: api.getCurrentUserID(),
      fb_api_caller_class: "RelayModern",
      variables: {
        input: {
          source: "friends_tab",
          actor_id: api.getCurrentUserID(),
          client_mutation_id: Math.round(Math.random() * 19).toString()
        },
        scale: 3,
        refresh_num: 0
      }
    };
  
    const success = [];
    const failed = [];
  
    if (args[0] == "add") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestConfirmMutation";
      form.doc_id = "3147613905362928";
    } else if (args[0] == "del") {
      form.fb_api_req_friendly_name = "FriendingCometFriendRequestDeleteMutation";
      form.doc_id = "4108254489275063";
    } else return api.sendMessage("Please select <add | del > <number | \"all\">", event.threadID, event.messageID);
    let targetIDs = args.slice(1);
  
    if (args[1] == "all") {
      targetIDs = [];
      const lengthList = listRequest.length;
      for (let i = 1; i <= lengthList; i++) targetIDs.push(i);
    }
  
    const newTargetIDs = [];
    const promiseFriends = [];
  
    for (const stt of targetIDs) {
      const u = listRequest[parseInt(stt) - 1];
      if (!u) {
        failed.push(`Can't find stt ${stt} in the list`);
        continue;
      }
      form.variables.input.friend_requester_id = u.node.id;
      form.variables = JSON.stringify(form.variables);
      newTargetIDs.push(u);
      promiseFriends.push(api.httpPost("https://www.facebook.com/api/graphql/", form));
      form.variables = JSON.parse(form.variables);
    }
  
    const lengthTarget = newTargetIDs.length;
    for (let i = 0; i < lengthTarget; i++) {
      try {
        const friendRequest = await promiseFriends[i];
        if (JSON.parse(friendRequest).errors) failed.push(newTargetIDs[i].node.name);
        else success.push(newTargetIDs[i].node.name);
      } catch (e) {
        failed.push(newTargetIDs[i].node.name);
      }
    }
  
    api.sendMessage(`Successfully ${args[0] == 'add' ? 'accept' : 'deny'} friend request of ${success.length} user(s):\n${success.join("\n")}${failed.length > 0 ? `\nFailed with ${failed.length} user(s): ${failed.join("\n")}` : ""}`, event.threadID, event.messageID);
  };
  
  module.exports.run = async ({
    event,
    api
  }) => {
    const moment = require("moment-timezone");
    const form = {
      av: api.getCurrentUserID(),
      fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
      fb_api_caller_class: "RelayModern",
      doc_id: "4499164963466303",
      variables: JSON.stringify({
        input: {
          scale: 3
        }
      })
    };
    const listRequest = JSON.parse(await api.httpPost("https://www.facebook.com/api/graphql/", form)).data.viewer.friending_possibilities.edges;
    let msg = "";
    let i = 0;
    const timeZone = "Asia/Manila"; // Change this to your desired time zone (UTC+8)
  
    for (const user of listRequest) {
      i++;
      const date = moment(user.time * 1000).tz(timeZone).format("MMMM D, YYYY"); 
      const time = moment(user.time * 1000).tz(timeZone).format("h:mm A");
      msg += (`\n${i}. Name: ${user.node.name}` +
        `\nID: ${user.node.id}` +
        `\nLink: ${user.node.url.replace("www.facebook", "fb")}` +
        `\nDate: ${date}` +
        `\nTime: ${time}\n`);
    }
    api.sendMessage(`${msg}\nReply to this message with content: <add | del> <number | \"all\"> to take action`, event.threadID, (e, info) => {
      global.client.handleReply.push({
        name: module.exports.config.name,
        messageID: info.messageID,
        listRequest,
        author: event.senderID
      });
    }, event.messageID);
  };
  
