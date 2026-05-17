import { fonts } from "../../assets";
import { Text } from "../Text";
export const Instructions = () => (
  <div>
    <Text
      style={{
        marginBottom: 8,
        width: 500,
        border: "1px solid rgba(0, 0, 0, 0.3)",
        borderRadius: 10,
        padding: 5,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
      }}
    >
      <p>
        Welcome! The graph already shows a tiny example: <b>a → at → art</b>.
        The bold word is the one you have selected.
      </p>
      <p>
        Pick any word in your graph by clicking it. Then type a word that is
        'connected' to it in the input field at top left, and press enter to add
        it.
      </p>
      Two words are connected if they differ by the addition, removal, or
      exchange of one letter: <br />
      Art → cart, by addition <br />
      Art → at, by removal <br />
      Art → ant, by exchange <br />
      The target word (top right) is your current goal. Reach it to score
      points; the harder the difficulty, the more points each target is worth.
      Adjust difficulty with the 'plus' and 'minus' buttons. <br />
      Zoom in and out on the graph by scrolling; double-click to recentre.{" "}
      <br />
      Your progress is saved in your browser, so you can come back anytime. Use{" "}
      <b>Reset</b> (top right) to start over from scratch. <br />
      Close these instructions with the button below. <br />
      Please send feedback or comments to arthurbthiele@gmail.com, or use{" "}
      <a href="https://forms.gle/KmDLHJ3Mas3kzcjz7">this form</a> to suggest
      word additions or removals:
      <Text style={{ ...fonts.secondary.footer, marginTop: 8 }}>
        Created by Arthur Thiele, © 2021.
      </Text>
    </Text>
  </div>
);
