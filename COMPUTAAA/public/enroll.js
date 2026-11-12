// The one-time token arrives in the URL fragment (#...), which is never sent to any server log.
const token = location.hash.slice(1);
history.replaceState(null, "", "/enroll.html");
const msg = document.getElementById("msg");

if (!token) msg.textContent = "Missing enrollment token. Run `npm run enroll` on the server and open the link it prints.";

document.getElementById("create").onclick = async () => {
  msg.textContent = "";
  try {
    const r = await PK.enroll(token, document.getElementById("name").value);
    document.getElementById("step1").hidden = true;
    document.getElementById("step2").hidden = false;
    if (r.recoveryCodes) {
      document.getElementById("codesBox").hidden = false;
      const ol = document.getElementById("codes");
      r.recoveryCodes.forEach((c) => {
        const li = document.createElement("li");
        li.textContent = c;
        ol.append(li);
      });
    }
  } catch (e) {
    msg.textContent = PK.niceError(e);
  }
};
