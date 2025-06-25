const Notification = ({ message, type }) => {
  if (!message) {
    return null;
  }
  return (
    <div className={`card notification ${type}`}>
      <p>{message}</p>
    </div>
  );
};

export default Notification;