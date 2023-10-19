const express = require("express"); // As this is modelled in the Express JS framework, this package is necessary for data transfer of any kind
const spawn = require("child_process").spawn; // The compilation of code is handled with child_process, as it allows shell commands to be executed in parallel with the NodeJS server
const bodyParser = require("body-parser");

const User = require("../models/user");
const checkAuth = require("../middleware/check-auth");

const router = express.Router();

// OpenAI config
const { Configuration, OpenAIApi } = require("openai");

// OpenAI key -- Allows us to use the AI Assistant hosted by ChatGPT
const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

// Compiler function compiles Python code by accepting the user's code and provided arguments -- initially was named "executeScript", though as user inputs were integrated a new function was created, hence "executeWithArgs"
async function executeWithArgs(code, args) {
  // Promise returns the output of the compiler, including any errors it may encounter in the meantime
  return new Promise(async (resolve, reject) => {
    let newScript = ""; // Variable is initialised

    newScript = spawn("python3", ["-c", code, " ", args]); // Spawn process is created -- this will execute the provided string as a Python3 execution

    let compResult = ""; // Stores compiler output

    // Function catches the output of the execution, with the exception of errors
    newScript.stdout.on("data", function (data) {
      console.log(data.toString()); // Data is logged
      compResult = data.toString(); // Output is appended to the string value
    });

    // Function catches compile-time errors -- anything regarding syntax or other simple errors
    newScript.stderr.on("data", (data) => {
      console.error(data.toString()); // ..
      compResult = data.toString(); // ..
    });

    // Function catches run-time errors -- anything that is encountered during execution
    newScript.on("error", function (err) {
      console.log("Error", err);
      reject(err); // Execution is cancelled
    });

    // Function detects when the script concludes execution, whether it be by reaching the end or encountering an error
    newScript.on("exit", () => {
      // Resolve the Promise with the compilation result
      resolve(compResult); // Output is returned
    });
  });
}

// POST endpoint for '/compile'
router.post("/compile/:id", async (req, res) => {
  // Vars passed by req.body
  const { exercise, codeStorage, fullCode, question, questionID, args, useAI } =
    req.body;

  // Boolean that indicates whether the user's answer is correct is defined
  var isCorrect = false;

  // compResult is initialised
  let compResult;

  // Try block allows errors to be caught during execution
  try {
    compResult = await executeWithArgs(codeStorage, args); // Output of execution is recorded in string

    console.log("Compiling");

    // AI response generation begins
    if (useAI == true) {
      // Bool value is provided by POST request -- default is false, though in the final execution it is made true
      let sPrompt = "The question is as follows: "; // This is the beginning of the prompt
      let qPrompt = question; // Question that the user is answering
      let uInput = fullCode; // User's unprocessed code -- "codeStorage" is processed to accept arguments, though "fullCode" is unaltered

      let prompt = sPrompt.concat(" ", qPrompt); // "prompt" is the field that is sent to the AI Assistant for processing
      prompt = prompt.concat(" ", "Here is my provided code: ");
      prompt = prompt.concat("\n", uInput); // User's code is added to the prompt for the AI
      prompt = prompt.concat(
        "\n\n",
        "It is worth noting that code is able to compile without following the question. Code may run without errors, though that doesn't mean it answers the question. For example, if a class constructor is missing parameters outlined in the question, the code may still compile so long as the missing values aren't referenced in the code. To make it clear, the code is still able to compile even if it doesn't follow the question. Please remember this."
      ); // ChatGPT has been found to lie about whether code can compile or not based on the premise of the provided question, as such this paragraph is attached to help it understand code is able to compile without following the bounds set by the question
      prompt = prompt.concat(
        " ",
        "Here is the output provided by the compiler:"
      );
      prompt = prompt.concat(" ", compResult); // Compiler output is provided in case the AI fails to detect an error
      prompt = prompt.concat(
        " ",
        "If there are any errors present, whether they are raised manually or otherwise detected in the code, it will not compile. Tell me if my provided code compiles. If not, why?"
      ); // This statement is included separately to question compliance as a result of the problem identified in the previous comment
      prompt = prompt.concat(
        " ",
        "If my code compiles, tell me if it complies with the question."
      ); // The final check for correct code. At this point, the AI should recognise whether or not the code can compile, leaving the question as to whether or not it follows the established question
      prompt = prompt.concat(
        " ",
        "If my code compiles AND complies with the question, congratulate me!"
      ); // The congratulations provided by the AI allow us to determine whether a user's answer is correct

      // OpenAI logic -- ChatGPT is provided with the prompt and calculates a response
      // Completion settings
      let response = await openai.createCompletion({
        model: "text-davinci-003", // Davinci is the model recommended by OpenAI for recreational use, and as we didn't have time to train our own models we instead opted for the appropriate option
        prompt: prompt,
        max_tokens: 1000,
      });

      console.log("Compiling");

      let completion = ""; // Initialize with an empty string

      // If statement allows the AI to create a response based on the provided prompt
      // The data is the AI formulating a response to the provided prompt
      // The choices are reflective of the number of possible responses to the provided prompt -- in this case, we only need one
      if (response.data && response.data.choices) {
        completion = response.data.choices[0]?.text;
      } else {
        console.error(
          "Response data is undefined or it doesn't have a 'choices' property"
        );
      }

      console.log(prompt);
      console.log(completion);

      // Boolean checks if the AI has congratulated the user for the correct answer
      if (completion.search("Congratulations") > -1) {
        // If the AI has congratulated the user, it more than likely means the AI deems the answer correct, so this is recorded
        isCorrect = true;
        console.log("The answer is true");
      } else {
        console.log("The answer is false");
      }

      // The response sent back to the app combines the output of the compiler and the AI's analysis
      compResult = compResult.concat("\n", completion);

      User.findById(req.params.id).then((user) => {
        if (!user) {
          return res.status(404).json({
            message: "User not found", // If a user is not found, an error is thrown
          });
        }

        // If statement checks for an existing entry under the same question ID string -- should one exist, the record is updated
        let existingEntry = user.qAnswers.find(
          (entry) => entry.qID === questionID
        );
        if (existingEntry) {
          // Update existing entry
          existingEntry.userAnswer = uInput;
          existingEntry.gptAnswer = compResult.replace(/^\s+/, "");
          existingEntry.ansCorrect = isCorrect;
          if (!existingEntry.completedOnce) {
            if (isCorrect) {
              existingEntry.completedOnce = true;
            }
          }
        } else {
          // Add new entry
          let data = {
            exercise: exercise,
            qID: questionID,
            userAnswer: uInput,
            gptAnswer: compResult.replace(/^\s+/, ""),
            ansCorrect: isCorrect,
            completedOnce: isCorrect,
          };
          user.qAnswers.push(data); // Data is appended to database
        }
        user.save(); // Change is saved
      });

      res.status(200).json({
        qID: req.body.qID,
        userAnswer: uInput,
        gptAnswer: compResult,
        ansCorrect: isCorrect,
      }); // Data is sent to webpage
    } else {
      // For user inputs, the code is broken into segments and fed through the compiler -- if it is not the last segment, the output is thrown straight back to the webpage
      res.json({ gptAnswer: compResult }); // Data is sent to webpage
    }
  } catch (error) {
    // Error handling
    console.log(error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
