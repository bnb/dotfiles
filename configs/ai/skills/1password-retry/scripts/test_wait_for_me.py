import plistlib
import unittest

from wait_for_me import is_present, parse_idle_seconds, parse_screen_locked


def root_plist(*users):
    return plistlib.dumps({"IOConsoleUsers": list(users)})


ON_CONSOLE = {"kCGSSessionOnConsoleKey": True, "kCGSSessionUserNameKey": "me"}


class ParseIdleSeconds(unittest.TestCase):
    def test_reads_nanoseconds(self):
        output = '  | |   "HIDIdleTime" = 2500000000\n'
        self.assertEqual(parse_idle_seconds(output), 2.5)

    def test_missing_key(self):
        self.assertIsNone(parse_idle_seconds('"HIDKeyboardModifierMappingPairs" = ()'))


class ParseScreenLocked(unittest.TestCase):
    def test_unlocked_session(self):
        self.assertFalse(parse_screen_locked(root_plist(ON_CONSOLE)))

    def test_locked_session(self):
        locked = {**ON_CONSOLE, "CGSSessionScreenIsLocked": True}
        self.assertTrue(parse_screen_locked(root_plist(locked)))

    def test_nobody_on_console(self):
        away = {**ON_CONSOLE, "kCGSSessionOnConsoleKey": False}
        self.assertTrue(parse_screen_locked(root_plist(away)))
        self.assertTrue(parse_screen_locked(plistlib.dumps({})))


class IsPresent(unittest.TestCase):
    def test_input_since_start(self):
        self.assertTrue(is_present(False, idle_seconds=1, now=110, since=100))

    def test_no_input_since_start(self):
        self.assertFalse(is_present(False, idle_seconds=30, now=110, since=100))

    def test_locked_with_recent_input(self):
        self.assertFalse(is_present(True, idle_seconds=1, now=110, since=100))


if __name__ == "__main__":
    unittest.main()
