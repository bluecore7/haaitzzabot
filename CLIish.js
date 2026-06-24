// /haaitzzabot-summarizer -time 5  -model gemini-pro -prompt "hey,just pick the msgs that have some tech to grasp dump everything else "  
function commandParser(fullCommand,allowedFlags) {
    if (!fullCommand) return {commands:{},errors:[]};
    else{
        let Commandobj={};
        let badFlags=[];
        let fullCommandArray=(" "+ fullCommand.trim()).split(' -')
        //console.log(fullCommandArray)

        fullCommandArray.forEach((item)=>{
            let cleanItem=item.trim();
            if(cleanItem=="") return;
            else{
                let keyvalue=item.split(" ");
                let key=keyvalue.shift();
                let value =keyvalue.join(" ").trim();
                if(allowedFlags.includes(key)){
                    Commandobj[key]=value;
                }else{
                    badFlags.push(key);
                }
            }

        })
        return {
            commands: Commandobj,
            errors: badFlags
        };
    }

}


module.exports=commandParser;

// console.log(commandParser(
//   ' -time 5  -model gemini-pro -prompt "hey,just pick the msgs that have some tech to grasp dump everything else "',['time','prompt']
// ));